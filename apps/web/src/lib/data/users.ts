import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
};

/**
 * The signed-in view of a user row.
 *
 * Everyone who can sign in has an email address. The only rows without one are
 * offline volunteers staff keep a record for, and those have no password and
 * no linked provider - so a row reaching a sign-in path without an address is
 * a broken invariant, and refusing loudly beats minting a session for it.
 */
export function toAuthenticatedUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: Role;
}): AuthenticatedUser {
  if (!user.email) {
    throw new Error(`User ${user.id} has no email address, so cannot sign in.`);
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}

/**
 * User.email is a case-sensitive unique column, so every lookup and create
 * must go through the same normalization or the same person can end up with
 * two accounts (John@x.com vs john@x.com) and case-dependent logins.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type CredentialsCheck =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "invalid-credentials" | "archived" | "email-unverified" };

/**
 * Checks email + password against the user table and says exactly why a
 * sign-in must be refused. The unverified check runs only after the password
 * matches, so "email-unverified" is never revealed to someone who doesn't
 * already know the account's password.
 */
export async function checkCredentials(
  email: string,
  password: string
): Promise<CredentialsCheck> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  // An offline volunteer's record has neither, so it lands here too.
  if (!user?.password) return { ok: false, reason: "invalid-credentials" };
  if (user.status === "ARCHIVED") return { ok: false, reason: "archived" };

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return { ok: false, reason: "invalid-credentials" };

  if (!user.emailVerified) return { ok: false, reason: "email-unverified" };

  return { ok: true, user: toAuthenticatedUser(user) };
}

/**
 * True only for an active, unverified credentials account whose password
 * matches. Lets a failed sign-in be disambiguated without re-running the
 * bcrypt comparison for the common failure cases (unknown email, wrong
 * password on a verified account): the hash comparison only happens when the
 * account is actually unverified. The "unverified" hint still requires
 * knowing the password, so this is neither a CPU amplifier for failed-login
 * sprays nor an account-probing oracle.
 */
export async function isUnverifiedCredentialsAccount(
  email: string,
  password: string
): Promise<boolean> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!user?.password || user.status === "ARCHIVED" || user.emailVerified) {
    return false;
  }

  return bcrypt.compare(password, user.password);
}

/**
 * Verifies email + password against the user table. Returns the user for a
 * valid, verified, non-archived credentials account; null otherwise.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const check = await checkCredentials(email, password);
  return check.ok ? check.user : null;
}

/**
 * Creates a new credentials account with the PUBLIC role. Returns an error
 * message when the email is already taken. Accounts start unverified unless
 * `emailVerified` is set - callers pass it when email sending is unavailable
 * and the verification gate would otherwise lock the account out forever.
 */
export async function createUserAccount(
  name: string,
  email: string,
  password: string,
  options?: { emailVerified?: boolean }
): Promise<{ user?: AuthenticatedUser; error?: string }> {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "PUBLIC",
      emailVerified: options?.emailVerified ? new Date() : null,
    },
  });

  return { user: toAuthenticatedUser({ ...user, email: normalizedEmail }) };
}
