import { z } from "zod";

/**
 * The one place password length is decided, for every path that reaches
 * bcrypt: register, sign-in, reset, and the account page - web and the
 * `/api/v1/auth/*` routes alike.
 *
 * The two bounds answer different questions, and conflating them is how the
 * truncation bug this module exists to prevent got in:
 *
 * - `PASSWORD_MAX_BYTES` is correctness. bcrypt hashes the first 72 bytes and
 *   silently drops the rest, so a password we accept past that point is a
 *   password whose tail does nothing.
 * - `PASSWORD_INPUT_MAX` is cost. `bcrypt.hash`/`bcrypt.compare` do work
 *   proportional to input size before truncating, so no unbounded string may
 *   reach them - least of all on sign-in, which is unauthenticated.
 *
 * Which applies depends on whether a password is being *set* or *verified*.
 * Setting gets both. Verifying gets only the cost bound: accounts created
 * before the byte cap existed may hold a longer password, and rejecting it at
 * the door would lock their owners out of the only form that could fix it.
 *
 * Kept free of server-only imports so client components can read the limits
 * for their field attributes.
 */

export const PASSWORD_MIN = 8;

/** bcrypt's truncation point. Bytes, not characters - see `newPasswordField`. */
export const PASSWORD_MAX_BYTES = 72;

/** Ceiling on anything handed to bcrypt, well above the byte cap. */
export const PASSWORD_INPUT_MAX = 1024;

const NOT_A_PASSWORD = "That doesn't look like a password.";

/**
 * UTF-8 byte length - what bcrypt actually measures. `TextEncoder` rather
 * than `Buffer` because this module is imported by client components.
 */
export function passwordByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * A password being **set**: bounded by both rules.
 *
 * The byte check is the one that bites. Counting characters would let a
 * password of macron vowels through - this app's copy is full of them, and
 * ā ē ī ō ū each cost two bytes in UTF-8, so 72 characters is 144 bytes and
 * bcrypt would quietly hash only the first half.
 */
export function newPasswordField(tooShortMessage: string) {
  return z
    .string(tooShortMessage)
    .min(PASSWORD_MIN, tooShortMessage)
    .max(PASSWORD_INPUT_MAX, NOT_A_PASSWORD)
    .refine(
      (value) => passwordByteLength(value) <= PASSWORD_MAX_BYTES,
      `That password is too long - it has to fit in ${PASSWORD_MAX_BYTES} bytes, which is ${PASSWORD_MAX_BYTES} plain characters or fewer if you use macrons or emoji.`
    );
}

/**
 * A password being **verified** against a stored hash: cost-bounded only, so
 * an account holding a pre-cap password can still be signed into.
 */
export function existingPasswordField(requiredMessage: string) {
  return z
    .string(requiredMessage)
    .min(1, requiredMessage)
    .max(PASSWORD_INPUT_MAX, NOT_A_PASSWORD);
}
