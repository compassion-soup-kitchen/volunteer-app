import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import {
  isSessionAccountActive,
  sessionOwnerId,
} from "@/lib/data/session-account";

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
 *
 * **Why the account is checked again here.** A bare `GET` that signs you out
 * is cross-site forgeable - an `<img src>` on any page would end the session
 * of whoever loaded it, because the browser attaches cookies to a plain GET
 * regardless of origin. Rather than accept that as a low-impact nuisance, the
 * route re-reads the account and only signs out when it really is gone.
 * Forging the request against a live account now does nothing but bounce the
 * person back to their own dashboard, so there is no state to change and
 * nothing worth forging. The cost is one primary-key lookup on a path that is
 * rare and already terminal.
 */
export async function GET() {
  const session = await auth();

  // No session to end - whatever sent them here, they are already signed out.
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Still a real, active account: this was not the layout gate redirecting a
  // dead session, so refuse to act on it. Asked of the session's owner - the
  // admin, when impersonating - for the same reason the gates do it: signing
  // out because the *borrowed* identity was deleted would take the admin's own
  // session with it. See `sessionOwnerId`.
  if (await isSessionAccountActive(sessionOwnerId(session.user))) {
    const role = session.user.role;
    redirect(
      role === "COORDINATOR" || role === "ADMIN"
        ? "/staff/dashboard"
        : "/dashboard"
    );
  }

  // `redirectTo` makes signOut itself issue the redirect, with the
  // cookie-clearing headers attached to that same response.
  await signOut({ redirectTo: "/login?signed-out=account-removed" });
}
