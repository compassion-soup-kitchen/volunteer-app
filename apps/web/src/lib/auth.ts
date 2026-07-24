import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getDb } from "./db";
import { verifyCredentials } from "./data/users";
import { googleProfileToUser, isOAuthSignInAllowed } from "./google-auth";
import type { Role } from "@prisma/client";

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
    async jwt({ token, trigger, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: Role }).role;
      }

      // `useSession().update()` — fired after someone edits their own account.
      // The JWT is the only copy of the name and role the chrome reads, so
      // re-read them from the database rather than trusting whatever the
      // client passed in.
      if (trigger === "update" && token.id) {
        const db = getDb();
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, email: true, role: true },
        });
        if (fresh) {
          token.name = fresh.name;
          token.email = fresh.email;
          token.role = fresh.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
