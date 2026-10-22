import { auth } from "@/lib/auth";
import { loadSessionAccess } from "@/lib/data/session-account";

/**
 * The session, but only if the account behind it still exists and is still
 * allowed in. Returns null otherwise, which every caller already treats as
 * "not signed in".
 *
 * **Why Server Actions can't rely on the layout gates.** Those gates run when
 * a route *renders*, and a Server Action mutation runs *before* the invoking
 * route re-renders. So an archived or deleted coordinator would keep full
 * write access - marking attendance, changing roles, deleting other people -
 * for as long as the JWT stayed valid, right up to its 30-day expiry, even
 * though their next full page load correctly bounced them out. The gate has to
 * sit on the mutation itself, not only on the page around it.
 *
 * The session is a JWT, so `auth()` alone can only report what was true when
 * the token was minted. `session.user.role` is likewise a snapshot: it is
 * refreshed by the `jwt` callback when a client fires `update()`, and never
 * otherwise - so a demoted coordinator kept every staff power for as long as
 * their session lived. This re-reads what must be current (is this still a
 * real, active account, on the token's version, and in what role) and
 * **overwrites `session.user.role` with the database's**, so every role check
 * downstream of it reads the live role. One query per action.
 *
 * The mobile API has always worked this way: `authenticateApiRequest` re-reads
 * the user on every request for exactly these reasons.
 *
 * Deliberately not applied in `proxy.ts`: middleware runs on the edge, where
 * Prisma cannot. The proxy stays a cheap JWT-shaped check, and the real gate
 * is here and in the layouts.
 */
export async function requireActiveSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const access = await loadSessionAccess(session.user);
  if (!access.canAct) return null;
  session.user.role = access.role;
  return session;
}

/** `requireActiveSession`, narrowed to coordinators and admins. */
export async function requireStaffSession() {
  const session = await requireActiveSession();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role)
  ) {
    return null;
  }
  return session as typeof session & { user: { id: string } };
}
