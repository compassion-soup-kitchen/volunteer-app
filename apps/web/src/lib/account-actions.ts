"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  getBaseUrl,
  sendEmail,
} from "@/lib/email";
import { passwordChangedEmail } from "@/lib/email-templates";
import { parseAccountDetails, parsePasswordChange } from "@/lib/account-schema";
import { passwordResetIdentifier } from "@/lib/password-reset";
import { accountRateLimits, checkRateLimit } from "@/lib/rate-limit";
import type { Role } from "@prisma/client";

/**
 * Self-service account management: the signed-in person editing their own
 * name and password. Every action scopes its write to `session.user.id`, so
 * there is no id parameter a caller could point at somebody else's account.
 */

export type AccountDetailsState = {
  error?: string;
  /** The saved name, so the client can refresh its JWT-backed session. */
  savedName?: string;
} | null;

export type PasswordChangeState = {
  error?: string;
  success?: string;
} | null;

export type MyAccount = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  emailVerified: Date | null;
  createdAt: Date;
  /** False for Google-only accounts, which have no password to change. */
  hasPassword: boolean;
};

const NOT_SIGNED_IN = "You need to be signed in to do that.";

/** The signed-in person's own account record, or null when signed out. */
export async function getMyAccount(): Promise<MyAccount | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      password: true,
    },
  });

  if (!user) return null;

  const { password, ...rest } = user;
  return { ...rest, hasPassword: Boolean(password) };
}

/** Update the signed-in person's display name. */
export async function updateAccountDetails(
  _prevState: AccountDetailsState,
  formData: FormData
): Promise<AccountDetailsState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NOT_SIGNED_IN };
  }

  const parsed = parseAccountDetails({ name: formData.get("name") });
  if (parsed.error !== undefined) {
    return { error: parsed.error };
  }

  const db = getDb();
  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  // The staff sidebar is the only chrome that renders the name, so this is
  // the only tree that needs invalidating. If this form is ever offered to
  // volunteers, add "/" here too - the root layout doesn't show the name
  // today, and invalidating it would flush every public route for nothing.
  revalidatePath("/staff", "layout");

  return { savedName: parsed.data.name };
}

/**
 * Change the signed-in person's password, re-authenticating with their
 * current one first so a borrowed session can't lock the owner out.
 */
export async function changeMyPassword(
  _prevState: PasswordChangeState,
  formData: FormData
): Promise<PasswordChangeState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NOT_SIGNED_IN };
  }

  const parsed = parsePasswordChange({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (parsed.error !== undefined) {
    return { error: parsed.error };
  }

  // Keyed by user id, not email: this endpoint is already behind a session,
  // and the budget should follow the account being attacked.
  const throttle = checkRateLimit(
    `password-change:${session.user.id}`,
    accountRateLimits.passwordChange
  );
  if (!throttle.allowed) {
    return {
      error:
        "Too many attempts just now. Please wait a few minutes and try again.",
    };
  }

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, password: true },
  });

  if (!user) {
    return { error: NOT_SIGNED_IN };
  }

  if (!user.password) {
    return {
      error:
        "This account signs in with Google, so there's no password to change. Use 'Forgot password' on the sign-in page if you'd like to set one.",
    };
  }

  const currentMatches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.password
  );
  if (!currentMatches) {
    return { error: "That current password isn't right." };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // Any outstanding reset link is now a loose key to the account — burn it.
  await db.verificationToken.deleteMany({
    where: { identifier: passwordResetIdentifier(user.email) },
  });

  const { subject, content } = passwordChangedEmail(
    user.name,
    `${getBaseUrl()}/forgot-password`
  );

  // sendEmail never throws; a delivery failure must not undo the change.
  await sendEmail({
    to: user.email,
    subject,
    html: buildBrandedEmailHtml(content),
    text: buildBrandedEmailText(content),
  });

  return {
    success:
      "Ka pai — your password has been updated. You'll stay signed in here.",
  };
}
