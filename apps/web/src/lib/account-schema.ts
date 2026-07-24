import { z } from "zod";

/**
 * Pure validation rules for the self-service account page (staff edit their
 * own name and change their own password). Kept out of the server actions so
 * they can be unit-tested and imported from client components for field
 * limits without pulling in server-only modules.
 */

export const ACCOUNT_NAME_MIN = 2;
export const ACCOUNT_NAME_MAX = 80;

export const PASSWORD_MIN = 8;

/**
 * bcrypt only hashes the first 72 **bytes**, so anything longer is silently
 * truncated. We say so up front rather than accept a password whose tail
 * doesn't count.
 *
 * Bytes, not characters: this app's copy is full of macrons, and every one of
 * ā ē ī ō ū costs two bytes in UTF-8. A 72-character password of those is 144
 * bytes, half of which bcrypt would quietly discard - which is the exact
 * failure this limit exists to prevent.
 */
export const PASSWORD_MAX_BYTES = 72;

/**
 * Hard ceiling on any password field before it reaches bcrypt. Deliberately
 * far above `PASSWORD_MAX_BYTES`: the *current* password can't be capped at
 * the bcrypt limit, because accounts created before that limit existed may
 * hold a longer one and their owners must still be able to type it in full.
 * This just stops an authenticated caller feeding megabytes to
 * `bcrypt.compare()`, whose cost scales with input size before it truncates.
 */
export const PASSWORD_INPUT_MAX = 1024;

/**
 * UTF-8 byte length - what bcrypt actually measures. `TextEncoder` rather
 * than `Buffer` because this module is imported by client components.
 */
export function passwordByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export const accountDetailsSchema = z.object({
  name: z
    .string("Please enter your name.")
    .trim()
    .min(ACCOUNT_NAME_MIN, "Your name needs at least 2 characters.")
    .max(ACCOUNT_NAME_MAX, `Keep your name under ${ACCOUNT_NAME_MAX} characters.`),
});

export type AccountDetailsInput = z.infer<typeof accountDetailsSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z
    .string("Enter your current password.")
    .min(1, "Enter your current password.")
    .max(PASSWORD_INPUT_MAX, "That doesn't look like a password."),
  newPassword: z
    .string("Choose a new password.")
    .min(PASSWORD_MIN, `Your new password needs at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_INPUT_MAX, "That doesn't look like a password.")
    .refine(
      (value) => passwordByteLength(value) <= PASSWORD_MAX_BYTES,
      `Your new password is too long - it has to fit in ${PASSWORD_MAX_BYTES} bytes, which is ${PASSWORD_MAX_BYTES} plain characters or fewer if you use macrons or emoji.`
    ),
  confirmPassword: z.string("Repeat your new password."),
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export type Parsed<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

/** Validate the details form, returning the first human-readable issue. */
export function parseAccountDetails(input: unknown): Parsed<AccountDetailsInput> {
  const parsed = accountDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Those details don't look right.",
    };
  }
  return { data: parsed.data };
}

/**
 * Validate a password change. Beyond the field rules this enforces the two
 * cross-field checks: the confirmation has to match, and the new password has
 * to actually be new (otherwise the form reports success while changing
 * nothing).
 */
export function parsePasswordChange(input: unknown): Parsed<PasswordChangeInput> {
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "That password doesn't look right.",
    };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { error: "Your new passwords don't match." };
  }

  if (newPassword === currentPassword) {
    return { error: "Your new password needs to be different from your current one." };
  }

  return { data: parsed.data };
}
