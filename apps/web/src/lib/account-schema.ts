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
 * bcrypt only hashes the first 72 bytes, so anything longer is silently
 * truncated. We say so up front rather than accept a password whose tail
 * doesn't count.
 */
export const PASSWORD_MAX = 72;

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
    .min(1, "Enter your current password."),
  newPassword: z
    .string("Choose a new password.")
    .min(PASSWORD_MIN, `Your new password needs at least ${PASSWORD_MIN} characters.`)
    .max(
      PASSWORD_MAX,
      `Passwords can be at most ${PASSWORD_MAX} characters.`
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
