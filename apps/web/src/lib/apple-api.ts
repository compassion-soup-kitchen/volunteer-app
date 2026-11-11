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

import { SignJWT, decodeJwt, importPKCS8 } from "jose";

const APPLE_AUDIENCE = "https://appleid.apple.com";
const TOKEN_URL = "https://appleid.apple.com/auth/token";
const REVOKE_URL = "https://appleid.apple.com/auth/revoke";

/** Apple caps client secrets at six months; well inside it, and cheap to remint. */
const SECRET_TTL = "30m";

export type AppleServerEnv = {
  APPLE_CLIENT_ID?: string;
  /**
   * The Services ID the website's Sign in with Apple runs under. A browser
   * flow can't use the app's bundle id - Apple only lets a Services ID carry a
   * web return URL - so it is a second client of the same team and key.
   */
  APPLE_WEB_CLIENT_ID?: string;
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

type AppleSigningKey = Omit<AppleServerCredentials, "clientId">;

/**
 * The `.p8` key and the ids that go with it, or null when any is missing.
 *
 * `APPLE_PRIVATE_KEY` holds the contents of the `.p8` file. Most secret stores
 * flatten newlines on the way in, so a literal `\n` is accepted and unescaped
 * here - a PKCS#8 PEM without real line breaks won't parse.
 */
function readSigningKey(env: AppleServerEnv): AppleSigningKey | null {
  const teamId = env.APPLE_TEAM_ID?.trim();
  const keyId = env.APPLE_KEY_ID?.trim();
  const privateKey = env.APPLE_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) return null;
  return { teamId, keyId, privateKey };
}

/** The app's credentials (bundle id as client), or null when any is missing. */
export function readAppleServerCredentials(
  env: AppleServerEnv = process.env as AppleServerEnv
): AppleServerCredentials | null {
  const clientId = env.APPLE_CLIENT_ID?.split(",")[0]?.trim();
  const key = readSigningKey(env);
  if (!clientId || !key) return null;
  return { clientId, ...key };
}

let warnedAboutBundleIdAsWebClient = false;

/**
 * The website's credentials (Services ID as client), or null when any is
 * missing - which is also what decides whether the web offers the button at
 * all, since the browser flow can't finish without a client secret.
 *
 * Also null when `APPLE_WEB_CLIENT_ID` is one of the app's bundle ids. An App
 * ID can't carry a web return URL, so Apple lets the person authenticate and
 * then strands them on its own "Sign Up Not Completed" page - nothing ever
 * reaches our callback to explain it. No button beats a button that can't work.
 */
export function readAppleWebCredentials(
  env: AppleServerEnv = process.env as AppleServerEnv
): AppleServerCredentials | null {
  const clientId = env.APPLE_WEB_CLIENT_ID?.trim();
  const key = readSigningKey(env);
  if (!clientId || !key) return null;

  const bundleIds = (env.APPLE_CLIENT_ID ?? "").split(",").map((id) => id.trim());
  if (bundleIds.includes(clientId)) {
    if (!warnedAboutBundleIdAsWebClient) {
      warnedAboutBundleIdAsWebClient = true;
      console.error(
        `[apple-web] APPLE_WEB_CLIENT_ID is the app's bundle id (${clientId}); it must be a Services ID whose Primary App ID is the app. Sign in with Apple is off on the website until it is.`
      );
    }
    return null;
  }
  return { clientId, ...key };
}

/**
 * Mints the JWT Apple accepts in place of a client secret. Signed with the
 * `.p8` key over ES256; `sub` is our client id and `iss` the team.
 */
async function createClientSecret(
  creds: AppleServerCredentials,
  ttlSeconds?: number
): Promise<string> {
  const key = await importPKCS8(creds.privateKey, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: creds.keyId })
    .setIssuer(creds.teamId)
    .setAudience(APPLE_AUDIENCE)
    .setSubject(creds.clientId)
    .setIssuedAt()
    .setExpirationTime(ttlSeconds ? `${ttlSeconds}s` : SECRET_TTL)
    .sign(key);
}

/** A day: long enough to mint rarely, short enough that a rotated key lands. */
const WEB_SECRET_TTL_SECONDS = 24 * 60 * 60;
/** Reminted this long before it lapses, so no sign-in races the expiry. */
const WEB_SECRET_REFRESH_MARGIN_MS = 60 * 60 * 1000;

let webSecret: { value: string; expiresAt: number; cacheKey: string } | null =
  null;

/**
 * The website's client secret for Auth.js, or null when web Sign in with Apple
 * isn't configured.
 *
 * It is a JWT that Apple refuses once it expires (six months at most), so it
 * can't be minted once at boot: a container that outlives it would quietly
 * break every Apple sign-in. Instead the auth config asks for it per request
 * and this hands back a cached one, reminted shortly before it lapses.
 */
export async function getAppleWebClientSecret(
  env: AppleServerEnv = process.env as AppleServerEnv,
  now: number = Date.now()
): Promise<string | null> {
  const creds = readAppleWebCredentials(env);
  if (!creds) return null;

  const cacheKey = `${creds.clientId}|${creds.teamId}|${creds.keyId}`;
  if (
    webSecret &&
    webSecret.cacheKey === cacheKey &&
    webSecret.expiresAt - WEB_SECRET_REFRESH_MARGIN_MS > now
  ) {
    return webSecret.value;
  }

  const value = await createClientSecret(creds, WEB_SECRET_TTL_SECONDS);
  webSecret = {
    value,
    cacheKey,
    expiresAt: now + WEB_SECRET_TTL_SECONDS * 1000,
  };
  return value;
}

/**
 * Which credentials a stored Apple authorisation has to be revoked with.
 *
 * Apple only accepts a revocation from the client the token was issued to. The
 * app's sign-ins never store an ID token, while a web sign-in stores the one
 * Auth.js received - whose audience names the Services ID. So a stored ID
 * token addressed to the web client means "revoke as the web"; anything else
 * is the app's.
 */
export function appleCredentialsForAccount(
  idToken: string | null | undefined,
  env: AppleServerEnv = process.env as AppleServerEnv
): AppleServerCredentials | null {
  const web = readAppleWebCredentials(env);
  if (web && idToken) {
    try {
      const audience = [decodeJwt(idToken).aud].flat();
      if (audience.includes(web.clientId)) return web;
    } catch {
      // Not a JWT we can read - fall through to the app's credentials.
    }
  }
  return readAppleServerCredentials(env);
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
  refreshToken: string,
  /** The account's stored ID token - it says which client issued the grant. */
  idToken?: string | null
): Promise<AppleRevocationResult> {
  const creds = appleCredentialsForAccount(idToken);
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
