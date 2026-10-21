import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { normalizeEmail } from "@/lib/data/users";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  getBaseUrl,
  sendEmail,
} from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import {
  PASSWORD_RESET_TOKEN_TTL_MS,
  hashPasswordResetToken,
  passwordResetIdentifier,
} from "@/lib/password-reset";
import { authRateLimits, checkRateLimit } from "@/lib/rate-limit";

/**
 * Sent whether or not the email exists - the response must not reveal which
 * addresses have accounts.
 */
export const RESET_NEUTRAL_MESSAGE =
  "If an account exists for that email address, we've sent it a reset link. The link is valid for 60 minutes.";

/**
 * Emails a single-use password reset link, shared by the web form and the
 * mobile API. Callers always answer with `RESET_NEUTRAL_MESSAGE`: an unknown
 * or archived address and a rate-limited attempt are skipped silently, so the
 * flow can't be used to probe which emails are registered (or to flood
 * someone's inbox).
 */
export async function sendPasswordResetLink(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);

  const throttle = checkRateLimit(
    `password-reset:${email}`,
    authRateLimits.passwordResetRequest
  );
  if (!throttle.allowed) return;

  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status === "ARCHIVED") return;

  const rawToken = randomBytes(32).toString("hex");
  const identifier = passwordResetIdentifier(email);

  // One outstanding link per person - a new request replaces any older ones.
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: hashPasswordResetToken(rawToken),
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${getBaseUrl()}/reset-password?token=${rawToken}`;
  const { subject, content } = passwordResetEmail(user.name, resetUrl);

  // sendEmail never throws; a delivery failure must not leak into the flow.
  await sendEmail({
    to: email,
    subject,
    html: buildBrandedEmailHtml(content),
    text: buildBrandedEmailText(content),
  });
}
