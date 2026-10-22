import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { getDb } from "@/lib/db";
import { verifyApiToken } from "./token";

export type ApiUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
};

/**
 * Resolves the user behind a `Authorization: Bearer <token>` header.
 * Re-reads the user from the database so role changes apply immediately, and
 * archived accounts and tokens from before a password change are locked out
 * even while the token itself is still valid.
 */
export async function authenticateApiRequest(
  req: NextRequest
): Promise<ApiUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const claims = await verifyApiToken(header.slice("Bearer ".length));
  if (!claims) return null;

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      sessionVersion: true,
    },
  });

  // No address means an offline volunteer's record, which never signs in.
  if (!user || user.status === "ARCHIVED" || !user.email) return null;
  // Minted before a password change or reset (or an archive) - revoked.
  if (user.sessionVersion !== claims.sessionVersion) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };
}

type AuthedHandler<C> = (
  req: NextRequest,
  user: ApiUser,
  ctx: C
) => Promise<Response>;

/** Wraps a route handler with bearer-token authentication. */
export function withApiAuth<C = unknown>(handler: AuthedHandler<C>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    const user = await authenticateApiRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }
    return handler(req, user, ctx);
  };
}
