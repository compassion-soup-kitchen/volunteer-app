/**
 * Refreshing the JWT from the database when a client asks for it.
 *
 * Sessions are JWTs, so the name and role in the token are a snapshot taken at
 * sign-in. `useSession().update()` lets a client ask for that snapshot to be
 * retaken - which means the update path is reachable by anyone holding a
 * session, and the payload they send with it is entirely under their control.
 *
 * The whole point of this module is that the payload is ignored: the fresh
 * values come from the row identified by `token.id`. Kept out of `auth.ts` so
 * that guarantee can be unit-tested without standing up NextAuth.
 */

import type { Role } from "@prisma/client";

/** The account fields the JWT mirrors. */
export type SessionUserFields = {
  name: string | null;
  email: string;
  role: Role;
};

/** Reads the current values for one account, or null if it's gone. */
export type SessionUserReader = (
  userId: string
) => Promise<SessionUserFields | null>;

/** The slice of the NextAuth token this touches. */
export type RefreshableToken = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
};

/**
 * Returns `token` with name/email/role taken from the database.
 *
 * Whatever those fields held on the way in is discarded - a client that posts
 * `update({ role: "ADMIN" })` gets back its real role, not the one it asked
 * for. Unknown accounts leave the token untouched rather than blanking it, so
 * a user deleted mid-session keeps a stale-but-harmless token until it
 * expires instead of turning into a session with no identity at all.
 */
export async function applySessionRefresh<T extends RefreshableToken>(
  token: T,
  read: SessionUserReader
): Promise<T> {
  if (typeof token.id !== "string" || token.id === "") return token;

  const fresh = await read(token.id);
  if (!fresh) return token;

  token.name = fresh.name;
  token.email = fresh.email;
  token.role = fresh.role;

  return token;
}
