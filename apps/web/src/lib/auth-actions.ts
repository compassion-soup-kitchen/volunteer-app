"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  checkCredentials,
  createUserAccount,
  normalizeEmail,
} from "@/lib/data/users";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  getBaseUrl,
  isEmailConfigured,
  sendEmail,
  type BrandedEmail,
} from "@/lib/email";
import {
  consumeVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";
import { authRateLimits, checkRateLimit } from "@/lib/rate-limit";
import { AuthError } from "next-auth";
import { z } from "zod";

export type AuthState = {
  error?: string;
  /** Set when sign-in failed only because the address isn't verified yet. */
  unverifiedEmail?: string;
} | null;

export type RegisterState = {
  error?: string;
  /** Set when the account was created and a verification link was emailed. */
  verificationSentTo?: string;
} | null;

export type VerifyEmailState =
  | { status: "success" }
  | { status: "error"; message: string }
  | null;

export type ResendVerificationState = {
  error?: string;
  success?: string;
} | null;

export type PasswordResetState = {
  error?: string;
  success?: string;
} | null;

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

const emailOnlySchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "This reset link is missing its token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

/** Reset tokens live for 60 minutes. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * VerificationToken.identifier prefix for password resets, so these rows can
 * never collide with NextAuth email-verification tokens if we add them later.
 */
const RESET_IDENTIFIER_PREFIX = "password-reset:";

/**
 * Sent whether or not the email exists — the response must not reveal which
 * addresses have accounts.
 */
const RESET_NEUTRAL_MESSAGE =
  "If an account exists for that email address, we've sent it a reset link. The link is valid for 60 minutes.";

const RESET_INVALID_TOKEN_MESSAGE =
  "This reset link has expired or already been used. Please request a fresh one.";

const VERIFY_INVALID_TOKEN_MESSAGE =
  "This verification link has expired or already been used. If you've already confirmed your email you can just sign in - otherwise request a fresh link below.";

/**
 * Sent whether or not the email exists - the response must not reveal which
 * addresses have accounts (or which are still unverified).
 */
const RESEND_VERIFICATION_NEUTRAL_MESSAGE =
  "If that address has an account waiting on verification, we've emailed it a fresh link. The link is valid for 24 hours.";

/** Only a sha256 hash of the reset token is ever stored. */
function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function retryAfterPhrase(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const throttle = checkRateLimit(
    `login:${normalizeEmail(parsed.data.email)}`,
    authRateLimits.login
  );
  if (!throttle.allowed) {
    return {
      error: `Too many sign-in attempts just now. Take a breather and try again in about ${retryAfterPhrase(throttle.retryAfterSeconds)}.`,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      // Distinguish "right password, unverified email" so people aren't told
      // their password is wrong when it isn't. checkCredentials only reveals
      // this after the password matches, so it's not an account-probing oracle.
      const check = await checkCredentials(
        parsed.data.email,
        parsed.data.password
      );
      if (!check.ok && check.reason === "email-unverified") {
        return {
          error:
            "Almost there - please verify your email address first. We sent you a link when you signed up.",
          unverifiedEmail: normalizeEmail(parsed.data.email),
        };
      }
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}

export async function register(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const throttle = checkRateLimit(
    `register:${normalizeEmail(parsed.data.email)}`,
    authRateLimits.register
  );
  if (!throttle.allowed) {
    return {
      error:
        "We've had a few sign-up attempts for this email just now. Please wait a little while and try again.",
    };
  }

  // Without email (local dev, missing Resend config) verification would be a
  // dead end - no link ever arrives - so degrade to the immediate sign-in flow
  // with the account marked verified.
  const emailConfigured = isEmailConfigured();

  const created = await createUserAccount(
    parsed.data.name,
    parsed.data.email,
    parsed.data.password,
    { emailVerified: !emailConfigured }
  );

  if (created.error || !created.user) {
    return { error: created.error ?? "Something went wrong. Please try again." };
  }

  if (emailConfigured) {
    // sendVerificationEmail never throws; if delivery fails the person can
    // request a fresh link from the panel this state renders.
    await sendVerificationEmail(created.user.email, created.user.name);
    return { verificationSentTo: created.user.email };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created but sign-in failed. Please try logging in." };
    }
    throw error;
  }
}

/**
 * Redeems an email-verification link. Token guessing is infeasible (32 random
 * bytes) so this needs no rate limit, matching `resetPassword`.
 */
export async function verifyEmail(
  _prevState: VerifyEmailState,
  rawToken: string
): Promise<VerifyEmailState> {
  const parsed = z.string().min(1).safeParse(rawToken);
  if (!parsed.success) {
    return { status: "error", message: VERIFY_INVALID_TOKEN_MESSAGE };
  }

  const verified = await consumeVerificationToken(parsed.data);
  return verified
    ? { status: "success" }
    : { status: "error", message: VERIFY_INVALID_TOKEN_MESSAGE };
}

/**
 * Emails a fresh verification link. Always resolves to the same neutral
 * message whether or not the account exists or still needs verifying, so the
 * form can't be used to probe registered addresses. Rate-limited attempts are
 * silently skipped behind the same neutral message for the same reason.
 */
export async function resendVerificationEmail(
  _prevState: ResendVerificationState,
  formData: FormData
): Promise<ResendVerificationState> {
  const parsed = emailOnlySchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = normalizeEmail(parsed.data.email);

  const throttle = checkRateLimit(
    `email-verify:${email}`,
    authRateLimits.verificationResend
  );
  if (!throttle.allowed) {
    return { success: RESEND_VERIFICATION_NEUTRAL_MESSAGE };
  }

  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status === "ARCHIVED" || user.emailVerified) {
    return { success: RESEND_VERIFICATION_NEUTRAL_MESSAGE };
  }

  await sendVerificationEmail(user.email, user.name);

  return { success: RESEND_VERIFICATION_NEUTRAL_MESSAGE };
}

/**
 * Emails a single-use password reset link. Always resolves to the same
 * neutral success message whether or not the account exists, so the form
 * can't be used to probe which emails are registered. Rate-limited attempts
 * are silently skipped behind the same neutral message for the same reason
 * (and so nobody's inbox can be flooded with reset emails).
 */
export async function requestPasswordReset(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const parsed = emailOnlySchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = normalizeEmail(parsed.data.email);

  const throttle = checkRateLimit(
    `password-reset:${email}`,
    authRateLimits.passwordResetRequest
  );
  if (!throttle.allowed) {
    return { success: RESET_NEUTRAL_MESSAGE };
  }

  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status === "ARCHIVED") {
    return { success: RESET_NEUTRAL_MESSAGE };
  }

  const rawToken = randomBytes(32).toString("hex");
  const identifier = `${RESET_IDENTIFIER_PREFIX}${email}`;

  // One outstanding link per person — a new request replaces any older ones.
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: hashResetToken(rawToken),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${getBaseUrl()}/reset-password?token=${rawToken}`;
  const content: BrandedEmail = {
    preview: "Choose a new password for your Te Pūaroha account",
    heading: "Reset your password",
    paragraphs: [
      user.name ? `Kia ora ${user.name},` : "Kia ora,",
      "We received a request to reset the password for your Te Pūaroha volunteer account. Tap the button below to choose a new one.",
      "The link is valid for 60 minutes and can only be used once.",
    ],
    cta: { label: "Choose a new password", url: resetUrl },
    footerNote:
      "If you didn't ask for this, you can safely ignore this email — your password won't change.",
  };

  // sendEmail never throws; a delivery failure must not leak into the flow.
  await sendEmail({
    to: user.email,
    subject: "Reset your Te Pūaroha password",
    html: buildBrandedEmailHtml(content),
    text: buildBrandedEmailText(content),
  });

  return { success: RESET_NEUTRAL_MESSAGE };
}

/**
 * Redeems a reset link: validates the token and new password, updates the
 * bcrypt hash, and burns the token (plus any other outstanding reset tokens
 * for the same account).
 */
export async function resetPassword(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const db = getDb();
  const record = await db.verificationToken.findFirst({
    where: { token: hashResetToken(parsed.data.token) },
  });

  if (
    !record ||
    !record.identifier.startsWith(RESET_IDENTIFIER_PREFIX) ||
    record.expires < new Date()
  ) {
    return { error: RESET_INVALID_TOKEN_MESSAGE };
  }

  const email = record.identifier.slice(RESET_IDENTIFIER_PREFIX.length);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status === "ARCHIVED") {
    return { error: RESET_INVALID_TOKEN_MESSAGE };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // Single use — burn this token and any other outstanding ones.
  await db.verificationToken.deleteMany({
    where: { identifier: record.identifier },
  });

  return {
    success: "All done — your password has been reset. Sign in with your new password whenever you're ready.",
  };
}
