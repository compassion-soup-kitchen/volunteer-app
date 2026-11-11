/**
 * Resolving a verified Google identity to one of our user accounts.
 *
 * This is the mobile counterpart to what NextAuth's Prisma adapter does for
 * the web Google button, and it deliberately reaches the same answers: link on
 * the `Account` row, create pre-verified PUBLIC users, and attach a Google
 * identity to an existing account with the same address only when that
 * account's address is verified (`decideEmailLink`).
 */

import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { GoogleIdentity } from "@/lib/google-id-token";
import { decideEmailLink } from "@/lib/oauth-account-linking";
import {
  normalizeEmail,
  toAuthenticatedUser,
  type AuthenticatedUser,
} from "./users";

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
 * An existing user with the same email but no linked Google account gets
 * Google added to it when their address is verified. An unverified address is
 * refused: it may have been claimed by a password account before anyone
 * proved they own the mailbox, so linking would hand it over. The website's
 * `signIn` callback applies the same rule (see `auth.ts`).
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

  try {
    const existing = await db.user.findUnique({
      where: { email },
      select: { ...userFields, emailVerified: true, isOffline: true },
    });
    if (existing) {
      const decision = decideEmailLink(existing);
      if (decision === "archived") return { ok: false, reason: "archived" };
      if (decision === "unverified") return { ok: false, reason: "not-linked" };
      // Same verified mailbox as the account they already have (perhaps made
      // with Apple, or a confirmed password account) - add Google to it.
      await db.account.create({
        data: {
          userId: existing.id,
          type: "oidc",
          provider: PROVIDER,
          providerAccountId: identity.sub,
        },
      });
      return { ok: true, user: toAuthenticatedUser(existing), created: false };
    }

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
