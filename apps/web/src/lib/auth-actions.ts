"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createUserAccount, normalizeEmail } from "@/lib/data/users";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  sendEmail,
  type BrandedEmail,
} from "@/lib/email";
import { authRateLimits, checkRateLimit } from "@/lib/rate-limit";
import { AuthError } from "next-auth";
import { z } from "zod";

export type AuthState = {
  error?: string;
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

const forgotPasswordSchema = z.object({
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

/** Only a sha256 hash of the reset token is ever stored. */
function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function getBaseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}

export async function register(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
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

  const created = await createUserAccount(
    parsed.data.name,
    parsed.data.email,
    parsed.data.password
  );

  if (created.error) {
    return { error: created.error };
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
  const parsed = forgotPasswordSchema.safeParse({
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
