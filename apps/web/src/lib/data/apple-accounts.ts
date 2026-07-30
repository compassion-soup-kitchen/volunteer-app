/**
 * Resolving a verified Apple identity to one of our user accounts.
 *
 * The Apple counterpart to `google-accounts`, reaching the same answers by the
 * same rules: link on the `Account` row, create pre-verified PUBLIC users, and
 * refuse to attach a new identity to an email address that already belongs to
 * somebody.
 *
 * Where it differs, Apple does. Only `sub` is guaranteed - the email arrives on
 * the first authorisation and may never be sent again, and the name is never in
 * the token at all (the client passes it, once, at sign-up). So the linked
 * `Account` row is authoritative for a returning person, and a *new* person
 * with no email is a state we refuse rather than guess at.
 */

import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { AppleIdentity } from "@/lib/apple-id-token";
import { normalizeEmail, type AuthenticatedUser } from "./users";

const PROVIDER = "apple";

export type AppleSignInResult =
  | { ok: true; user: AuthenticatedUser; created: boolean }
  | { ok: false; reason: "archived" | "not-linked" | "no-email" };

const userFields = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userFields }>;

function toAuthenticatedUser(user: UserRow): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}

/** Prisma's unique-constraint violation - two sign-ins racing to create. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export type AppleSignInInput = {
  identity: AppleIdentity;
  /**
   * The name Apple handed the *client* on first authorisation. Untrusted and
   * cosmetic - used only to label an account being created this moment, never
   * to overwrite a name an existing person has set.
   */
  fullName?: string | null;
  /** Apple refresh token, stored so deletion can revoke the authorisation. */
  refreshToken?: string | null;
};

/**
 * Finds - or first-time creates - the account behind an Apple identity whose
 * token has already been verified.
 *
 * An existing user with the same email but no linked Apple account is refused
 * rather than adopted, exactly as for Google: that address may have been
 * claimed by a password account before anyone proved they own the mailbox, so
 * silently linking would hand it over.
 */
export async function signInWithAppleIdentity(
  input: AppleSignInInput
): Promise<AppleSignInResult> {
  return resolve(input, true);
}

async function resolve(
  input: AppleSignInInput,
  mayRetry: boolean
): Promise<AppleSignInResult> {
  const db = getDb();
  const { identity } = input;

  const linked = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.sub,
      },
    },
    select: { id: true, refresh_token: true, user: { select: userFields } },
  });

  if (linked) {
    if (linked.user.status === "ARCHIVED") {
      return { ok: false, reason: "archived" };
    }
    // Apple only returns a code worth exchanging on some sign-ins; when we did
    // get a fresh refresh token, keep it, so revocation on deletion has the
    // newest handle rather than a stale one.
    if (input.refreshToken && input.refreshToken !== linked.refresh_token) {
      await db.account.update({
        where: { id: linked.id },
        data: { refresh_token: input.refreshToken },
      });
    }
    return { ok: true, user: toAuthenticatedUser(linked.user), created: false };
  }

  // Nothing linked and no address to make an account from. This is the
  // signature of someone who deleted their account while Apple still
  // remembered the authorisation - Apple withholds the email on every sign-in
  // after the first, so there is genuinely nothing here to create a person
  // from. `revokeAppleToken` on deletion is what prevents it.
  if (!identity.email) {
    return { ok: false, reason: "no-email" };
  }

  const email = normalizeEmail(identity.email);

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "not-linked" };

  const name = input.fullName?.trim();

  try {
    const user = await db.user.create({
      data: {
        name: name || null,
        email,
        role: "PUBLIC",
        // Apple has already proved the address (and owns the mailbox outright
        // for a relay), so this account never sits behind the verification
        // gate.
        emailVerified: new Date(),
        accounts: {
          create: {
            type: "oidc",
            provider: PROVIDER,
            providerAccountId: identity.sub,
            refresh_token: input.refreshToken ?? null,
          },
        },
      },
      select: userFields,
    });

    return { ok: true, user: toAuthenticatedUser(user), created: true };
  } catch (error) {
    // A double-tapped button can put two sign-ins in flight at once; the loser
    // of the create race just re-reads what the winner wrote.
    if (mayRetry && isUniqueViolation(error)) return resolve(input, false);
    throw error;
  }
}
