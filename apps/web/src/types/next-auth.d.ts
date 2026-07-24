import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import type { Impersonator } from "@/lib/impersonation";

/** The real admin surfaced to the UI while impersonating (no role). */
type ImpersonatorSummary = {
  id: string;
  name: string | null;
  email: string | null;
};

declare module "next-auth" {
  interface User {
    role: Role;
    emailVerified?: Date | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      /** Present only while an admin is impersonating this (effective) user. */
      impersonator?: ImpersonatorSummary;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    /** The real admin, carried only while impersonating. */
    impersonator?: Impersonator;
  }
}
