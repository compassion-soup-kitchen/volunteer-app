import { jwtVerify, SignJWT } from "jose";

/**
 * Bearer tokens for the mobile API (`/api/v1/*`).
 *
 * NextAuth's encrypted session cookie doesn't suit a native app, so mobile
 * clients authenticate with a signed JWT issued at login/registration and sent
 * as `Authorization: Bearer <token>`. The token carries only the user id —
 * role and account status are re-read from the database on every request, so
 * archiving a user revokes their access immediately.
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

export async function issueApiToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

/** Returns the user id the token was issued for, or null if invalid/expired. */
export async function verifyApiToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
