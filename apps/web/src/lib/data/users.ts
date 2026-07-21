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
 * User.email is a case-sensitive unique column, so every lookup and create
 * must go through the same normalization or the same person can end up with
 * two accounts (John@x.com vs john@x.com) and case-dependent logins.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Verifies email + password against the user table. Returns the user for a
 * valid, non-archived credentials account; null otherwise.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!user?.password) return null;
  if (user.status === "ARCHIVED") return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}

/**
 * Creates a new credentials account with the PUBLIC role. Returns an error
 * message when the email is already taken.
 */
export async function createUserAccount(
  name: string,
  email: string,
  password: string
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
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    },
  };
}
