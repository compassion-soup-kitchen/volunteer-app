"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireActiveSession } from "@/lib/action-auth";
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
import {
  eraseUserAccount,
  loadAccountErasureFacts,
} from "@/lib/data/account-erasure";
import {
  summariseOwnAccountDeletion,
  validateSelfDeletion,
  type OwnAccountDeletionSummary,
} from "@/lib/user-deletion";
import type { Role } from "@prisma/client";

/**
 * Self-service account management: the signed-in person editing their own
 * name and password.
 *
 * These are gated on identity, not role, and that is deliberate. Every action
 * scopes its write to `session.user.id` - there is no id parameter a caller
 * could point at somebody else's account - so the authorisation question is
 * "are you signed in?", not "what are you?". CLAUDE.md's "always check role in
 * Server Actions" is about not letting the UI be the only thing standing
 * between a caller and someone else's data; here nothing but your own row is
 * reachable in the first place, which is the same shape as the existing
 * `updateVolunteerProfile`.
 *
 * Adding a COORDINATOR/ADMIN gate would not close a hole - it would stop a
 * volunteer changing their own password, which is a capability we want them to
 * have, and would quietly break the volunteer profile the moment this form is
 * wired in there. Only the page is staff-only, because it is the only place
 * the form is currently rendered.
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
  const session = await requireActiveSession();
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
  const session = await requireActiveSession();
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

  // The staff sidebar is the only chrome that renders the name, so it's the
  // only tree that needs invalidating - and only for someone who can actually
  // see it. This action is reachable by any signed-in caller (see the note at
  // the top of the file), and a volunteer shouldn't be able to flush the staff
  // route cache by renaming themselves. If this form is ever offered to
  // volunteers, add "/" for them: the root layout doesn't render the name
  // today, so invalidating it would flush every public route for nothing.
  if (session.user.role === "COORDINATOR" || session.user.role === "ADMIN") {
    revalidatePath("/staff", "layout");
  }

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
  const session = await requireActiveSession();
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

// ─── Deleting your own account ───────────────────────

/**
 * Erasing your own account, the self-service sibling of
 * `staff-actions.deleteUser`.
 *
 * The authority is different, so the rules are: nobody has to approve this,
 * and the only thing that can stand in the way is being the last admin (see
 * `findSelfDeletionBlocker`). Required by the Privacy Act's erasure
 * expectations, and by App Store guideline 5.1.1(v) — an app that lets you
 * make an account has to let you unmake it, in the app, without ringing
 * anybody. What "erased" means is shared with the admin path in
 * `@/lib/data/account-erasure`, so the two can't drift.
 *
 * The mobile app reaches these same two steps over `GET`/`DELETE /api/v1/me`.
 */

/** Read-only: what `deleteOwnAccount` would destroy. */
export async function getOwnAccountDeletionSummary(): Promise<
  OwnAccountDeletionSummary | { error: string }
> {
  const session = await requireActiveSession();
  if (!session?.user?.id) return { error: NOT_SIGNED_IN };

  const facts = await loadAccountErasureFacts(session.user.id);
  if (!facts) return { error: "That account no longer exists." };

  return summariseOwnAccountDeletion(facts);
}

/**
 * Permanently erase the signed-in person's own account. Confirmed by typing
 * their own email address — the same friction the admin flow uses, and the
 * "confirmation step to prevent accidental deletion" the guideline allows.
 */
export async function deleteOwnAccount(
  confirmation: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireActiveSession();
  if (!session?.user?.id) return { error: NOT_SIGNED_IN };

  const facts = await loadAccountErasureFacts(session.user.id);
  if (!facts) return { error: "That account no longer exists." };

  const validationError = validateSelfDeletion({
    isLastAdmin: facts.isLastAdmin,
    email: facts.email,
    confirmation,
  });
  if (validationError) return { error: validationError };

  // Actor and target are the same person — that is the whole point.
  return eraseUserAccount(facts, facts.userId);
}
