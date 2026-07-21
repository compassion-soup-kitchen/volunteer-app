/**
 * Email verification for new credentials accounts.
 *
 * Shared between the web register/resend Server Actions and the mobile
 * `/api/v1/auth/register` route so both surfaces issue identical tokens.
 * Mirrors the password-reset flow in `auth-actions.ts`: only a sha256 hash of
 * the token is stored (in NextAuth's VerificationToken table), links are
 * single-use, and a fresh request replaces any outstanding one.
 *
 * This module is deliberately NOT a "use server" file - its exports must not
 * become publicly invokable actions. The Server Actions wrapping it add input
 * validation and rate limiting.
 */

import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  getBaseUrl,
  sendEmail,
  type BrandedEmail,
  type SendEmailResult,
} from "@/lib/email";

/** Verification links live for 24 hours. */
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * VerificationToken.identifier prefix for account email verification, so
 * these rows can never collide with password-reset tokens (`password-reset:`).
 */
export const VERIFICATION_IDENTIFIER_PREFIX = "email-verify:";

/** Only a sha256 hash of the verification token is ever stored. */
function hashVerificationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issues a fresh verification token for `email` (replacing any outstanding
 * one) and emails the link. `email` must already be normalized.
 */
export async function sendVerificationEmail(
  email: string,
  name: string | null
): Promise<SendEmailResult> {
  const db = getDb();
  const rawToken = randomBytes(32).toString("hex");
  const identifier = `${VERIFICATION_IDENTIFIER_PREFIX}${email}`;

  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: hashVerificationToken(rawToken),
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  const verifyUrl = `${getBaseUrl()}/verify-email?token=${rawToken}`;
  const content: BrandedEmail = {
    preview: "One quick click and your account is ready to go",
    heading: "Confirm your email address",
    paragraphs: [
      name ? `Kia ora ${name},` : "Kia ora,",
      "Nau mai, haere mai - welcome to Te Pūaroha. Please confirm this email address so we know it's really you, then you're all set to sign in.",
      "The link is valid for 24 hours and can only be used once.",
    ],
    cta: { label: "Confirm my email", url: verifyUrl },
    footerNote:
      "If you didn't create a Te Pūaroha account, you can safely ignore this email.",
  };

  return sendEmail({
    to: email,
    subject: "Confirm your email for Te Pūaroha",
    html: buildBrandedEmailHtml(content),
    text: buildBrandedEmailText(content),
  });
}

/**
 * Redeems a verification link: marks the account's email as verified and
 * burns the token. Returns false for unknown, expired, foreign-prefix, or
 * orphaned tokens. A second click on an already-redeemed link returns false
 * (the token is gone) - callers word that error to point people at sign-in.
 */
export async function consumeVerificationToken(rawToken: string): Promise<boolean> {
  const db = getDb();
  const record = await db.verificationToken.findFirst({
    where: { token: hashVerificationToken(rawToken) },
  });

  if (
    !record ||
    !record.identifier.startsWith(VERIFICATION_IDENTIFIER_PREFIX) ||
    record.expires < new Date()
  ) {
    return false;
  }

  const email = record.identifier.slice(VERIFICATION_IDENTIFIER_PREFIX.length);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status === "ARCHIVED") {
    return false;
  }

  if (!user.emailVerified) {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  // Single use - burn this token and any other outstanding ones.
  await db.verificationToken.deleteMany({
    where: { identifier: record.identifier },
  });

  return true;
}
