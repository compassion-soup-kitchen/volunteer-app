/**
 * Talking to Apple's identity server as *us*, rather than just verifying what
 * the app hands over.
 *
 * Two things need this, and only one of them is sign-in:
 *
 * - **Code exchange.** The native sheet returns an authorization code
 *   alongside the identity token. Exchanging it yields a refresh token, which
 *   is the only handle Apple gives us on the authorisation itself.
 * - **Revocation, which the App Store requires.** Guideline 5.1.1(v) says an
 *   app offering Sign in with Apple must revoke the person's tokens when they
 *   delete their account. Skipping it also breaks the next sign-up: Apple
 *   returns the name and email exactly once per authorisation, so somebody who
 *   deleted their account and came back would arrive with a `sub` we no longer
 *   know and no email to make an account from. Revoking resets that, and their
 *   next sign-in is a first sign-in again.
 *
 * All of it is gated on server credentials Apple only issues from a paid
 * developer account (a `.p8` signing key, its key id, and the team id). When
 * they're absent this module reports "not configured" and sign-in still works
 * - it just can't revoke. That is a deployment gap worth shouting about, not a
 * reason to fail a person's sign-in, so callers log it loudly and carry on.
 */

import { SignJWT, importPKCS8 } from "jose";

const APPLE_AUDIENCE = "https://appleid.apple.com";
const TOKEN_URL = "https://appleid.apple.com/auth/token";
const REVOKE_URL = "https://appleid.apple.com/auth/revoke";

/** Apple caps client secrets at six months; well inside it, and cheap to remint. */
const SECRET_TTL = "30m";

export type AppleServerEnv = {
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
};

export type AppleServerCredentials = {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
};

/**
 * The credentials, or null when any is missing.
 *
 * `APPLE_PRIVATE_KEY` holds the contents of the `.p8` file. Most secret stores
 * flatten newlines on the way in, so a literal `\n` is accepted and unescaped
 * here - a PKCS#8 PEM without real line breaks won't parse.
 */
export function readAppleServerCredentials(
  env: AppleServerEnv = process.env as AppleServerEnv
): AppleServerCredentials | null {
  const clientId = env.APPLE_CLIENT_ID?.split(",")[0]?.trim();
  const teamId = env.APPLE_TEAM_ID?.trim();
  const keyId = env.APPLE_KEY_ID?.trim();
  const privateKey = env.APPLE_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");

  if (!clientId || !teamId || !keyId || !privateKey) return null;
  return { clientId, teamId, keyId, privateKey };
}

/**
 * Mints the short-lived JWT Apple accepts in place of a client secret. Signed
 * with the `.p8` key over ES256; `sub` is our client id and `iss` the team.
 */
async function createClientSecret(
  creds: AppleServerCredentials
): Promise<string> {
  const key = await importPKCS8(creds.privateKey, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: creds.keyId })
    .setIssuer(creds.teamId)
    .setAudience(APPLE_AUDIENCE)
    .setSubject(creds.clientId)
    .setIssuedAt()
    .setExpirationTime(SECRET_TTL)
    .sign(key);
}

async function postForm(
  url: string,
  body: Record<string, string>
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
}

/**
 * Exchanges the sheet's authorization code for a refresh token, which we keep
 * only so the account can be revoked when it is deleted.
 *
 * Returns null on any failure - a sign-in must not fail because Apple's token
 * endpoint had a bad moment. The cost of a missing refresh token is that
 * deletion can't revoke; it's logged so that shows up.
 */
export async function exchangeAppleAuthorizationCode(
  code: string
): Promise<string | null> {
  const creds = readAppleServerCredentials();
  if (!creds) return null;

  try {
    const res = await postForm(TOKEN_URL, {
      client_id: creds.clientId,
      client_secret: await createClientSecret(creds),
      code,
      grant_type: "authorization_code",
    });

    if (!res.ok) {
      console.warn(
        "[apple-api] authorization code exchange failed:",
        res.status,
        await res.text().catch(() => "")
      );
      return null;
    }

    const body = (await res.json()) as { refresh_token?: unknown };
    return typeof body.refresh_token === "string" ? body.refresh_token : null;
  } catch (e) {
    console.warn("[apple-api] authorization code exchange error:", e);
    return null;
  }
}

export type AppleRevocationResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "failed" };

/**
 * Revokes an Apple refresh token, unlinking the app from that Apple ID.
 *
 * Never throws: this runs as part of deleting an account, and the person's
 * data must go whether or not Apple answers. A failure is logged so it can be
 * chased, which is the honest position - we cannot un-delete their account to
 * retry later.
 */
export async function revokeAppleToken(
  refreshToken: string
): Promise<AppleRevocationResult> {
  const creds = readAppleServerCredentials();
  if (!creds) return { ok: false, reason: "not-configured" };

  try {
    const res = await postForm(REVOKE_URL, {
      client_id: creds.clientId,
      client_secret: await createClientSecret(creds),
      token: refreshToken,
      token_type_hint: "refresh_token",
    });

    if (!res.ok) {
      console.warn(
        "[apple-api] token revocation failed:",
        res.status,
        await res.text().catch(() => "")
      );
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[apple-api] token revocation error:", e);
    return { ok: false, reason: "failed" };
  }
}
