/**
 * Pure helpers for the Google sign-in side of the email-verification gate,
 * kept out of the NextAuth config so they can be unit-tested without
 * mocking OAuth.
 */

import type { Role } from "@prisma/client";

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
 * A Google sign-in must arrive with a verified address, or it would bypass
 * the verification gate credentials accounts go through. Sign-ins from any
 * other provider pass through untouched.
 */
export function isOAuthSignInAllowed(
  account: { provider: string } | null | undefined,
  profile: { email_verified?: boolean | null } | undefined
): boolean {
  if (account?.provider !== "google") return true;
  return profile?.email_verified === true;
}
