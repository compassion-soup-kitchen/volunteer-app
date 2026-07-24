/**
 * Shared shape of the password-reset token, so every module that issues,
 * redeems, or invalidates one agrees on the identifier namespace and the
 * hashing. Mirrors `email-verification.ts`.
 *
 * Deliberately NOT a "use server" file - these exports must not become
 * publicly invokable actions, and a "use server" module can only export async
 * functions (so constants couldn't live there anyway).
 */

import { createHash } from "node:crypto";

/** Reset tokens live for 60 minutes. */
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * VerificationToken.identifier prefix for password resets, so these rows can
 * never collide with email-verification tokens (`email-verify:`).
 */
export const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:";

/** The identifier holding every outstanding reset token for one address. */
export function passwordResetIdentifier(normalizedEmail: string): string {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${normalizedEmail}`;
}

/** Only a sha256 hash of the reset token is ever stored. */
export function hashPasswordResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
