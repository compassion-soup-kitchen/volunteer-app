import { jwtVerify, SignJWT } from "jose";
import { getDb } from "@/lib/db";

/**
 * Bearer tokens for the mobile API (`/api/v1/*`).
 *
 * NextAuth's encrypted session cookie doesn't suit a native app, so mobile
 * clients authenticate with a signed JWT issued at login/registration and sent
 * as `Authorization: Bearer <token>`. The token carries only the user id and
 * the `User.sessionVersion` it was minted on — role, account status and the
 * current version are re-read from the database on every request, so
 * archiving a user, or their changing or resetting their password, revokes it
 * immediately.
 */

const ISSUER = "csk-web";
const AUDIENCE = "csk-mobile";
const EXPIRY = "30d";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/** What a valid token says about who it was issued to. */
export type ApiTokenClaims = {
  userId: string;
  /** Tokens issued before versions existed carry none; they read as 0. */
  sessionVersion: number;
};

export async function issueApiToken(
  userId: string,
  sessionVersion: number
): Promise<string> {
  return new SignJWT({ ver: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

/**
 * Issues a token for `userId` on their current `sessionVersion`. What the
 * sign-in routes call: the version is read here rather than threaded through
 * each provider's user shape.
 */
export async function issueApiTokenForUser(userId: string): Promise<string> {
  const row = await getDb().user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return issueApiToken(userId, row?.sessionVersion ?? 0);
}

/** Returns who the token was issued for, or null if invalid/expired. */
export async function verifyApiToken(
  token: string
): Promise<ApiTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      sessionVersion: typeof payload.ver === "number" ? payload.ver : 0,
    };
  } catch {
    return null;
  }
}
