import { CredentialsSignin } from "next-auth";
import {
  normalizeEmail,
  verifyCredentials,
  type AuthenticatedUser,
} from "@/lib/data/users";
import { authRateLimits, checkRateLimit } from "@/lib/rate-limit";

/**
 * A sign-in refused because the address has used its `login:` budget.
 * Carries the wait so the sign-in form can say how long.
 */
export class SignInRateLimited extends CredentialsSignin {
  code = "rate_limited";

  constructor(readonly retryAfterSeconds: number) {
    super();
  }
}

/**
 * The Credentials provider's `authorize`, kept out of `auth.ts` so it can be
 * tested without standing up NextAuth.
 *
 * **Why the throttle lives here.** It used to sit only in the `login` Server
 * Action, but that action is one way in, not the only one: NextAuth serves
 * `POST /api/auth/callback/credentials` itself, publicly, and that endpoint
 * calls this function directly. Anyone posting there skipped the limit and
 * could guess passwords without end. Every credentials sign-in passes through
 * here, so the budget is spent here. It shares the `login:` key with
 * `/api/v1/auth/login`, so switching clients doesn't double it.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>> | undefined
): Promise<AuthenticatedUser | null> {
  const email = credentials?.email;
  const password = credentials?.password;
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (!email || !password) return null;

  const throttle = checkRateLimit(
    `login:${normalizeEmail(email)}`,
    authRateLimits.login
  );
  if (!throttle.allowed) {
    throw new SignInRateLimited(throttle.retryAfterSeconds);
  }

  return verifyCredentials(email, password);
}
