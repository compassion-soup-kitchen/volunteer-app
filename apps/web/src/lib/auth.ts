import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getDb } from "./db";
import { verifyCredentials } from "./data/users";
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
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "PUBLIC",
          // Google has already verified the address before we ever see it -
          // record that so the credentials verification gate never applies
          // to OAuth accounts.
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
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
      // A Google account must arrive with a verified address, or it would
      // bypass the verification gate credentials accounts go through.
      if (account?.provider === "google" && profile?.email_verified !== true) {
        return false;
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: Role }).role;
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
