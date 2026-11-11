import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import type { NextRequest } from "next/server";
import { getDb } from "./db";
import { getAppleWebClientSecret, readAppleWebCredentials } from "./apple-api";
import {
  appleFormPostCookies,
  appleProfileToUser,
  usesSecureCookies,
  type AppleProfileClaims,
} from "./apple-auth";
import { authorizeCredentials } from "./credentials-authorize";
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

/** The version a newly minted session carries; 0 for an unknown account. */
async function readSessionVersion(userId: string): Promise<number> {
  const row = await getDb().user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return row?.sessionVersion ?? 0;
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isOffline: true,
      },
    }),
  recordStart: async (impersonatorId: string, targetUserId: string) => {
    const event = await getDb().impersonationEvent.create({
      data: { impersonatorId, targetUserId },
      select: { id: true },
    });
    return event.id;
  },
  // `updateMany`, not `update`, so a missing row is a no-op rather than a
  // throw. `ImpersonationEvent.target` cascades, so deleting the impersonated
  // account takes this audit row with it - and the admin then has to be able
  // to climb back out. With `update` the P2025 propagates out of the `jwt`
  // callback as a JWTSessionError, which destroys the very session the return
  // button is trying to restore: the admin is locked out by the act of
  // returning. Nothing is lost by tolerating it; the row is gone precisely
  // because we were asked to erase everything about that person.
  recordStop: async (eventId: string) => {
    await getDb().impersonationEvent.updateMany({
      where: { id: eventId, endedAt: null },
      data: { endedAt: new Date() },
    });
  },
};

/** Whether an Apple identity is already linked to one of our accounts. */
async function isAppleIdentityLinked(sub: string): Promise<boolean> {
  const linked = await getDb().account.findUnique({
    where: {
      provider_providerAccountId: { provider: "apple", providerAccountId: sub },
    },
    select: { id: true },
  });
  return Boolean(linked);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = PrismaAdapter(getDb()) as any;

/**
 * Sign in with Apple on the web, or nothing when it isn't configured - in
 * which case the sign-in pages don't offer the button either.
 *
 * Built per request because its client secret is a JWT that Apple stops
 * accepting when it expires (see `getAppleWebClientSecret`).
 */
async function appleProvider() {
  const creds = readAppleWebCredentials();
  const clientSecret = await getAppleWebClientSecret();
  if (!creds || !clientSecret) return [];
  return [
    Apple({
      clientId: creds.clientId,
      clientSecret,
      profile: (profile) => appleProfileToUser(profile as AppleProfileClaims),
    }),
  ];
}

// A function rather than an object: Auth.js then rebuilds the config for each
// request, which is what lets the Apple client secret be reminted before it
// lapses, and lets the cookie settings follow the request's protocol.
export const { handlers, auth, signIn, signOut } = NextAuth(async (req?: NextRequest) => ({
  adapter,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    // Refused OAuth sign-ins land on /login with `?error=`, where
    // `signInErrorMessage` explains them, instead of Auth.js's bare page.
    error: "/login",
  },
  cookies: appleFormPostCookies(usesSecureCookies(req?.url)),
  events: {
    // Auth.js creates OAuth users with `emailVerified: null` regardless of what
    // the profile says. Both providers are only let in with an address they
    // have verified (see `isOAuthSignInAllowed`), so record it - otherwise
    // staff see every Google and Apple account as unverified.
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      await getDb().user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile: googleProfileToUser,
    }),
    ...(await appleProvider()),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // Rate limited inside - see credentials-authorize.ts for why it must be.
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!isOAuthSignInAllowed(account, profile)) return false;
      // Apple can leave the address out of a returning sign-in. With a linked
      // account that's fine - it is the source of truth for the address - but
      // with none there is nothing to make a person from, and Auth.js would
      // otherwise create a user with no email at all. Almost always someone
      // whose earlier account was deleted while Apple still remembered it.
      if (
        account?.provider === "apple" &&
        !profile?.email &&
        !(await isAppleIdentityLinked(account.providerAccountId))
      ) {
        return "/login?error=AppleNoEmail";
      }
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
        // The version this session was minted on. Bumping the column (password
        // change or reset, archiving) ends every session minted before it - see
        // `loadSessionAccess`. Read here rather than trusted from `user`, which
        // the OAuth adapter and the credentials path shape differently.
        token.sessionVersion = await readSessionVersion(user.id!);
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
        session.user.sessionVersion =
          typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
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
}));
