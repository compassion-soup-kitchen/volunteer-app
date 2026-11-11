/**
 * Pure helpers for the Google sign-in side of the email-verification gate,
 * kept out of the NextAuth config so they can be unit-tested without
 * mocking OAuth.
 */

import type { Role } from "@prisma/client";
import { isAppleEmailVerified } from "./apple-auth";

type GoogleProfileClaims = {
  sub: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  email_verified?: boolean | null;
};

/**
 * Maps Google's OIDC claims into our User shape. Google has already verified
 * the address before we ever see it - stamping `emailVerified` here keeps
 * OAuth accounts clear of the credentials verification gate.
 */
export function googleProfileToUser(profile: GoogleProfileClaims) {
  return {
    id: profile.sub,
    name: profile.name,
    email: profile.email,
    image: profile.picture,
    role: "PUBLIC" as Role,
    emailVerified: profile.email_verified ? new Date() : null,
  };
}

/**
 * An OAuth sign-in must arrive with a verified address, or it would bypass
 * the verification gate credentials accounts go through.
 *
 * Google always sends the address, so it must be verified. Apple may leave it
 * out on a returning sign-in - there is then nothing to verify, and whether
 * the person may in is down to an already-linked account (see `auth.ts`) - and
 * sends `email_verified` as a string as often as a boolean. Any other provider
 * passes through untouched.
 */
export function isOAuthSignInAllowed(
  account: { provider: string } | null | undefined,
  profile:
    | { email?: string | null; email_verified?: boolean | string | null }
    | undefined
): boolean {
  if (account?.provider === "google") return profile?.email_verified === true;
  if (account?.provider === "apple") {
    if (!profile?.email) return true;
    return isAppleEmailVerified(profile.email_verified);
  }
  return true;
}
