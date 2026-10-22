import type { Role, UserStatus } from "@prisma/client";
import { getDb } from "@/lib/db";

/**
 * Confirming that the account behind a session is still allowed in, and as
 * what.
 *
 * Sessions are JWTs, so everything the web app knows about who you are comes
 * from a signed token rather than the database. That is fast and it is why
 * `auth()` costs nothing - but it means the token outlives the facts it was
 * minted from. Three of them must be current, so they are re-read here:
 *
 * - **status** - someone deleted or archived mid-session would otherwise keep
 *   browsing on a token nobody can revoke.
 * - **role** - the role in the token is a snapshot from sign-in. Reading it
 *   from the token meant a demoted admin kept every admin power for as long
 *   as their session lived; nothing about a demotion reached it.
 * - **sessionVersion** - bumped by a password change or reset and by
 *   archiving, so a stolen cookie stops working the moment its owner acts.
 *
 * The mobile API has never had the first two problems: `authenticateApiRequest`
 * re-reads the user on every call for exactly this reason. This is the web's
 * equivalent, called from the two layout gates and from `requireActiveSession`
 * so the check sits on every authenticated page and every Server Action.
 *
 * One query per navigation, which for a kitchen of ~100 people is a fair
 * price for "demoting or deleting someone takes effect straight away".
 */

/** The account fields a session is checked against. */
export type SessionAccountRow = {
  id: string;
  status: UserStatus;
  role: Role;
  sessionVersion: number;
};

/** The parts of `session.user` this reads. */
export type SessionIdentity = {
  id: string;
  role: Role;
  sessionVersion?: number;
  impersonator?: { id: string } | null;
};

export type SessionAccess = {
  /**
   * Should this browser still be signed in at all? Asked of the session's
   * owner - the admin, while impersonating (see `sessionOwnerId`). False sends
   * the layouts to `/api/auth/session-ended`.
   */
  alive: boolean;
  /**
   * May the effective identity write? Server Actions need the owner alive
   * *and* the person they act as to still be active.
   */
  canAct: boolean;
  /** The effective identity's role as the database has it now. */
  role: Role;
};

/**
 * Pure verdict, kept apart from the read so every combination can be
 * unit-tested.
 *
 * - The owner must exist, be active and still be on the token's version.
 * - While impersonating, the owner must also still be an admin: the authority
 *   to borrow someone's identity is re-checked on every request, not only at
 *   the moment it was borrowed. Without this an admin archived or demoted
 *   mid-impersonation kept acting as whoever they had borrowed.
 * - The role is the database's. Only when the effective account has gone (an
 *   admin impersonating someone since deleted) does it fall back to the
 *   token's, so the admin can still see the banner and climb out.
 */
export function decideSessionAccess(input: {
  tokenRole: Role;
  tokenVersion: number;
  impersonating: boolean;
  owner: SessionAccountRow | null;
  effective: SessionAccountRow | null;
}): SessionAccess {
  const { owner, effective } = input;
  const alive =
    owner !== null &&
    owner.status === "ACTIVE" &&
    owner.sessionVersion === input.tokenVersion &&
    (!input.impersonating || owner.role === "ADMIN");

  return {
    alive,
    canAct: alive && effective?.status === "ACTIVE",
    role: effective?.role ?? input.tokenRole,
  };
}

/** Reads the session's owner (and effective identity, if different). */
export async function loadSessionAccess(
  user: SessionIdentity
): Promise<SessionAccess> {
  const ownerId = sessionOwnerId(user);
  const ids = ownerId === user.id ? [user.id] : [ownerId, user.id];

  const rows = await getDb().user.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, role: true, sessionVersion: true },
  });
  const byId = (id: string) => rows.find((row) => row.id === id) ?? null;

  // Missing means deleted - by an admin, or by the person themselves from the
  // app or their account page.
  return decideSessionAccess({
    tokenRole: user.role,
    // Tokens minted before versions existed carry none; the column defaults
    // to 0, so they stay valid until the first bump.
    tokenVersion: user.sessionVersion ?? 0,
    impersonating: ownerId !== user.id,
    owner: byId(ownerId),
    effective: byId(user.id),
  });
}

/** The landing page for a role. */
export function homeForRole(role: Role): string {
  return role === "COORDINATOR" || role === "ADMIN"
    ? "/staff/dashboard"
    : "/dashboard";
}

/**
 * The account a session actually *belongs to*, which is not always the one it
 * currently presents as.
 *
 * While an admin is impersonating, the token's identity is wholly the
 * target's - `session.user.id` is theirs, and that is the point (see
 * `impersonation.ts`). But the session is still the admin's, and the question
 * this gate asks is "should this browser still be signed in?". Asking it about
 * the borrowed identity gets it badly wrong: if the target is deleted
 * mid-impersonation - by another admin, or by the impersonating admin using
 * the target's own Delete account page - the gate would sign the *admin* out
 * of their own session, clearing `token.impersonator` and the way back with
 * it. The escape hatch (`ImpersonationReturnButton`, and the plain `auth()` in
 * `stopImpersonation`) never gets the chance to run, because it lives inside
 * the layout the gate redirects away from.
 *
 * So: the impersonator when there is one, otherwise the person themselves. An
 * admin impersonating a deleted target keeps their session, sees the banner,
 * and can return to their own account - while Server Actions still refuse
 * them, because `requireActiveSession` deliberately asks about the *effective*
 * identity and a deleted person may not write.
 */
export function sessionOwnerId(user: {
  id: string;
  impersonator?: { id: string } | null;
}): string {
  return user.impersonator?.id ?? user.id;
}
