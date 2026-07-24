import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getDb } from "./db";
import { verifyCredentials } from "./data/users";
import { googleProfileToUser, isOAuthSignInAllowed } from "./google-auth";
import { applySessionRefresh } from "./session-refresh";
import { applyImpersonationUpdate, type Impersonator } from "./impersonation";
import type { Role } from "@prisma/client";

/** Current name/email/role for one account - the JWT's source of truth. */
function readSessionUser(userId: string) {
  return getDb().user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  });
}

/**
 * The impersonation helper's collaborators, wired to the database. `readUser`
 * loads the id/status the start/stop validation needs; the recorders open and
 * close the ImpersonationEvent audit row.
 */
const impersonationDeps = {
  readUser: (userId: string) =>
    getDb().user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, status: true },
    }),
  recordStart: async (impersonatorId: string, targetUserId: string) => {
    const event = await getDb().impersonationEvent.create({
      data: { impersonatorId, targetUserId },
      select: { id: true },
    });
    return event.id;
  },
  recordStop: async (eventId: string) => {
    await getDb().impersonationEvent.update({
      where: { id: eventId },
      data: { endedAt: new Date() },
    });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(getDb()) as any,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile: googleProfileToUser,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        return verifyCredentials(
          credentials.email as string,
          credentials.password as string
        );
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!isOAuthSignInAllowed(account, profile)) return false;
      // Block archived users from any provider (Google, Credentials)
      if (!user?.id) return true;
      const db = getDb();
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      return dbUser?.status !== "ARCHIVED";
    },
    async jwt({ token, trigger, user, session }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: Role }).role;
      }

      // `useSession().update(payload)` — fired to start/stop impersonation or
      // after someone edits their own account. The payload is client-controlled,
      // so authority is re-derived from the signed token, never trusted from the
      // payload (see impersonation.ts / session-refresh.ts and their tests).
      if (trigger === "update") {
        const impersonation = await applyImpersonationUpdate(
          token,
          session as Parameters<typeof applyImpersonationUpdate>[1],
          impersonationDeps
        );
        if (impersonation.handled) {
          return impersonation.token;
        }
        // A plain account edit — the JWT is the only copy of the name/role the
        // chrome reads, so re-read them from the database rather than the client.
        return applySessionRefresh(token, readSessionUser);
      }

      return token;
    },
    async session({ session, token }) {
      // A token with no id is a deliberately-cleared identity: stopping
      // impersonation when the admin's own account has since been archived or
      // deleted leaves nothing to restore. Return an unauthenticated session so
      // `proxy.ts` and the layout gates bounce to /login, rather than an object
      // whose `user.id` is undefined - which reads as authenticated and blows up
      // the first `findUnique({ where: { id } })` downstream.
      if (typeof token.id !== "string" || token.id === "") {
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role as Role;
        // Surface the real admin (id/name/email only) so the UI can show the
        // impersonation banner and offer a way back.
        const impersonator = token.impersonator as Impersonator | undefined;
        session.user.impersonator = impersonator
          ? {
              id: impersonator.id,
              name: impersonator.name,
              email: impersonator.email,
            }
          : undefined;
      }
      return session;
    },
  },
});
