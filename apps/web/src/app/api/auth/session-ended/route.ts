import { signOut } from "@/lib/auth";

/**
 * Where a session whose account no longer exists is sent to die.
 *
 * The layout gates re-read the account on every authenticated page (see
 * `isSessionAccountActive`), but a layout renders - it cannot clear a cookie.
 * Redirecting straight to `/login` would therefore bounce for ever: the JWT
 * still says "signed in", so `proxy.ts` sends it back to the dashboard, which
 * fails the same check again.
 *
 * A route handler *can* set cookies, so this is the one place that can end it:
 * clear the session, then land on the sign-in page. Reached only by redirect,
 * never linked.
 *
 * It sits under `/api/auth` so the proxy's existing allowlist covers it, and
 * takes precedence over NextAuth's `[...nextauth]` catch-all because a static
 * segment always beats a dynamic one.
 */
export async function GET() {
  // `redirectTo` makes signOut itself issue the redirect, with the
  // cookie-clearing headers attached to that same response.
  await signOut({ redirectTo: "/login?signed-out=account-removed" });
}
