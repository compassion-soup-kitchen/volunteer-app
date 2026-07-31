import { getDb } from "@/lib/db";

/**
 * Confirming that the account behind a session still exists and is still
 * allowed in.
 *
 * Sessions are JWTs, so everything the web app knows about who you are comes
 * from a signed token rather than the database. That is fast and it is why
 * `auth()` costs nothing - but it means the token outlives the account it
 * names. Someone deleted or archived mid-session would otherwise keep browsing
 * on a token nobody can revoke, for as long as it stays valid.
 *
 * The mobile API has never had this problem: `authenticateApiRequest` re-reads
 * the user on every call for exactly this reason. This is the web's equivalent,
 * called from the two layout gates so the check sits on every authenticated
 * page rather than being remembered per route.
 *
 * One primary-key lookup per navigation, which for a kitchen of ~100 people is
 * a fair price for "deleting your account signs you out everywhere".
 */
export async function isSessionAccountActive(
  userId: string
): Promise<boolean> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  // Missing means deleted - by an admin, or by the person themselves from the
  // app or their account page.
  return user?.status === "ACTIVE";
}

/**
 * The account a session actually *belongs to*, which is not always the one it
 * currently presents as.
 *
 * While an admin is impersonating, the token's identity is wholly the
 * target's - `session.user.id` is theirs, and that is the point (see
 * `impersonation.ts`). But the session is still the admin's, and the question
 * this gate asks is "should this browser still be signed in?". Asking it about
 * the borrowed identity gets it badly wrong: if the target is deleted
 * mid-impersonation - by another admin, or by the impersonating admin using
 * the target's own Delete account page - the gate would sign the *admin* out
 * of their own session, clearing `token.impersonator` and the way back with
 * it. The escape hatch (`ImpersonationReturnButton`, and the plain `auth()` in
 * `stopImpersonation`) never gets the chance to run, because it lives inside
 * the layout the gate redirects away from.
 *
 * So: the impersonator when there is one, otherwise the person themselves. An
 * admin impersonating a deleted target keeps their session, sees the banner,
 * and can return to their own account - while Server Actions still refuse
 * them, because `requireActiveSession` deliberately asks about the *effective*
 * identity and a deleted person may not write.
 */
export function sessionOwnerId(user: {
  id: string;
  impersonator?: { id: string } | null;
}): string {
  return user.impersonator?.id ?? user.id;
}
