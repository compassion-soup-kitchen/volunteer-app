/**
 * Resolving a verified Google identity to one of our user accounts.
 *
 * This is the mobile counterpart to what NextAuth's Prisma adapter does for
 * the web Google button, and it deliberately reaches the same answers: link on
 * the `Account` row, create pre-verified PUBLIC users, and refuse to attach a
 * Google identity to an email address that already belongs to somebody.
 */

import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { GoogleIdentity } from "@/lib/google-id-token";
import { normalizeEmail, type AuthenticatedUser } from "./users";

const PROVIDER = "google";

export type GoogleSignInResult =
  | { ok: true; user: AuthenticatedUser; created: boolean }
  | { ok: false; reason: "archived" | "not-linked" };

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

/**
 * Finds - or first-time creates - the account behind a Google identity whose
 * ID token has already been verified.
 *
 * An existing user with the same email but no linked Google account is
 * refused rather than adopted: that address may have been claimed by a
 * password account before anyone proved they own the mailbox, so silently
 * linking would hand it over. The web flow behaves the same way (NextAuth
 * raises `OAuthAccountNotLinked` for exactly this case).
 */
export async function signInWithGoogleIdentity(
  identity: GoogleIdentity
): Promise<GoogleSignInResult> {
  return resolve(identity, true);
}

async function resolve(
  identity: GoogleIdentity,
  mayRetry: boolean
): Promise<GoogleSignInResult> {
  const db = getDb();
  const email = normalizeEmail(identity.email);

  const linked = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.sub,
      },
    },
    select: { user: { select: userFields } },
  });

  if (linked) {
    if (linked.user.status === "ARCHIVED") {
      return { ok: false, reason: "archived" };
    }
    return { ok: true, user: toAuthenticatedUser(linked.user), created: false };
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "not-linked" };

  try {
    const user = await db.user.create({
      data: {
        name: identity.name,
        email,
        image: identity.picture,
        role: "PUBLIC",
        // Google has already proved the address, so this account never sits
        // behind the verification gate.
        emailVerified: new Date(),
        accounts: {
          create: {
            type: "oidc",
            provider: PROVIDER,
            providerAccountId: identity.sub,
          },
        },
      },
      select: userFields,
    });

    return { ok: true, user: toAuthenticatedUser(user), created: true };
  } catch (error) {
    // A double-tapped button can put two sign-ins in flight at once; the
    // loser of the create race just re-reads what the winner wrote.
    if (mayRetry && isUniqueViolation(error)) return resolve(identity, false);
    throw error;
  }
}
