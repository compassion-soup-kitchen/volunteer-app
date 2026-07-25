/**
 * Turning an admin session into "viewing as another user" - and back again.
 *
 * Sessions are JWTs, and the token is the only source of truth for who the app
 * thinks you are (id/role/name/email). Impersonation swaps that effective
 * identity to the target while stashing the real admin in `token.impersonator`,
 * so the proxy, the layouts, and every server action treat the admin exactly as
 * the target - no per-call plumbing, and the admin is confined to what the
 * target can do until they return.
 *
 * The transition is triggered by `useSession().update(payload)`, which is
 * client-callable and whose payload is entirely attacker-controlled. So the
 * authority to start impersonation is read from the *signed* token
 * (`token.role === "ADMIN"`), never from the payload: a volunteer that posts
 * `update({ impersonate: someId })` is refused here. Kept out of `auth.ts` and
 * given injected collaborators so this guarantee can be unit-tested without
 * standing up NextAuth or a database.
 *
 * Attribution tradeoff (intentional): because the effective identity fully
 * becomes the target, any server action that stamps who-did-this from
 * `session.user.id` (attendance, meals, application reviews, ...) records the
 * *target*, not the admin. Writes are deliberately allowed - the point is to
 * reproduce what the person can do - so the audit link back to the admin is the
 * `ImpersonationEvent` row's [startedAt, endedAt] window, not a per-action
 * field. The confirmation dialog before starting spells this out, and the
 * banner keeps it visible throughout. If per-action attribution is ever needed,
 * that's a schema change (stamp `impersonatorId` alongside the actor), not a
 * change here.
 */

import type { Role } from "@prisma/client";

/** The real admin, carried on the token only while impersonating. */
export type Impersonator = {
  id: string;
  role: Role;
  name: string | null;
  email: string | null;
  /** The open ImpersonationEvent row, closed when they return. */
  eventId: string;
};

/** The slice of the NextAuth token this reads and rewrites. */
export type ImpersonatableToken = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  impersonator?: Impersonator;
};

/** What `update()` may carry to drive impersonation. */
export type ImpersonationPayload = {
  /** Target user id to begin impersonating. */
  impersonate?: unknown;
  /** Return to the admin's own account. */
  stopImpersonating?: unknown;
};

/** The target/admin fields needed to validate and rebuild the token. */
export type ImpersonationUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  status: "ACTIVE" | "ARCHIVED";
};

export type ImpersonationDeps = {
  /** Reads one account, or null if it's gone. */
  readUser: (userId: string) => Promise<ImpersonationUserRow | null>;
  /** Opens an audit row, returning its id. */
  recordStart: (impersonatorId: string, targetUserId: string) => Promise<string>;
  /** Closes the audit row named by `eventId`. */
  recordStop: (eventId: string) => Promise<void>;
};

/**
 * `handled: false` means the payload wasn't an impersonation instruction, so
 * the caller should fall through to its normal update handling. `handled: true`
 * means the token is authoritative as returned (whether the request was honoured
 * or silently refused).
 */
export type ImpersonationResult<T> = {
  handled: boolean;
  token: T;
};

/**
 * The outcome of a validation check. `message` is a user-facing reason, surfaced
 * by the server action as a toast; the `jwt` callback only reads `ok`.
 */
export type ImpersonationCheck = { ok: true } | { ok: false; message: string };

/**
 * Whether the actor is allowed to begin *any* impersonation, from who they are
 * alone - no database read needed. Kept separate from the target checks so the
 * security-sensitive `jwt` path can refuse a forged non-admin request without
 * ever hitting the database (a volunteer spamming `update({ impersonate })`
 * must not amplify into DB load).
 */
export function checkImpersonatorAuthority(input: {
  actorRole: Role | undefined;
  actorIsImpersonating: boolean;
  actorId: string;
  targetId: string;
}): ImpersonationCheck {
  if (input.actorIsImpersonating) {
    return {
      ok: false,
      message: "Return to your own account before impersonating someone else.",
    };
  }
  if (!input.actorId || input.actorRole !== "ADMIN") {
    return {
      ok: false,
      message: "Only admins can view the app as another person.",
    };
  }
  if (input.targetId === input.actorId) {
    return { ok: false, message: "You can't impersonate yourself." };
  }
  return { ok: true };
}

/**
 * Whether a loaded target may be impersonated. `target: null` means the account
 * wasn't found. Callers run this only after `checkImpersonatorAuthority` passes,
 * so the two together are the single source of truth for "can A impersonate B".
 */
export function checkImpersonationTarget(
  target: Pick<ImpersonationUserRow, "role" | "status"> | null
): ImpersonationCheck {
  if (!target) {
    return { ok: false, message: "That person's account no longer exists." };
  }
  if (target.status === "ARCHIVED") {
    return { ok: false, message: "You can't impersonate an archived account." };
  }
  if (target.role === "ADMIN") {
    return { ok: false, message: "You can't impersonate another admin." };
  }
  return { ok: true };
}

/**
 * Applies an impersonation start/stop to `token`, or reports the payload wasn't
 * one so the caller can handle it otherwise.
 *
 * Refusals are silent by design (return the token unchanged with `handled:
 * true`): a forged start from a non-admin, a target that doesn't exist or is
 * archived or is themselves an admin, or self-impersonation all leave the token
 * exactly as it arrived rather than erroring - the session simply stays who it
 * already was.
 */
export async function applyImpersonationUpdate<T extends ImpersonatableToken>(
  token: T,
  payload: ImpersonationPayload | null | undefined,
  deps: ImpersonationDeps
): Promise<ImpersonationResult<T>> {
  if (payload?.stopImpersonating === true) {
    await stopImpersonating(token, deps);
    return { handled: true, token };
  }

  if (typeof payload?.impersonate === "string" && payload.impersonate !== "") {
    await startImpersonating(token, payload.impersonate, deps);
    return { handled: true, token };
  }

  return { handled: false, token };
}

async function startImpersonating(
  token: ImpersonatableToken,
  targetUserId: string,
  { readUser, recordStart }: ImpersonationDeps
): Promise<void> {
  // Authority comes from the signed token, not the caller's payload - and it's
  // checked before any database read so a forged non-admin request can't amplify
  // into DB load. Shares the validation with the server action (which reuses
  // these helpers to produce the user-facing error) so the two can't drift.
  if (typeof token.id !== "string" || token.id === "") return;
  const adminId = token.id;

  const authority = checkImpersonatorAuthority({
    actorRole: token.role as Role | undefined,
    actorIsImpersonating: Boolean(token.impersonator),
    actorId: adminId,
    targetId: targetUserId,
  });
  if (!authority.ok) return;

  const target = await readUser(targetUserId);
  if (!checkImpersonationTarget(target).ok) return;
  // Past the guard, `target` is non-null.
  if (!target) return;

  const eventId = await recordStart(adminId, target.id);

  token.impersonator = {
    id: adminId,
    role: "ADMIN",
    name: (token.name as string | null | undefined) ?? null,
    email: (token.email as string | null | undefined) ?? null,
    eventId,
  };

  token.id = target.id;
  token.role = target.role;
  token.name = target.name;
  token.email = target.email;
}

async function stopImpersonating(
  token: ImpersonatableToken,
  { readUser, recordStop }: ImpersonationDeps
): Promise<void> {
  const impersonator = token.impersonator;
  if (!impersonator) return;

  await recordStop(impersonator.eventId);
  delete token.impersonator;

  // Re-read the admin so a role change or archival during the impersonation is
  // reflected on return. If the admin account is gone or archived, leave the
  // identity fields cleared - the layout auth gate then bounces the session to
  // sign-in rather than restoring a dead admin.
  const admin = await readUser(impersonator.id);
  if (!admin || admin.status === "ARCHIVED") {
    token.id = undefined;
    token.role = undefined;
    token.name = undefined;
    token.email = undefined;
    return;
  }

  token.id = admin.id;
  token.role = admin.role;
  token.name = admin.name;
  token.email = admin.email;
}
