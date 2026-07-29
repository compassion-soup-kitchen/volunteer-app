/**
 * Verification for Google ID tokens presented by the mobile app.
 *
 * The native app runs Google's own sign-in sheet, so it holds an ID token
 * rather than a password. It posts that token to `/api/v1/auth/google`, and we
 * re-verify it here from scratch - signature against Google's published keys,
 * issuer, audience, expiry - before trusting a single claim inside it. Nothing
 * the client says about who they are is taken at face value.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");

/** Google mints tokens under both spellings; either is legitimate. */
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Cached across requests: the remote key set fetches Google's signing keys
// once and refreshes them on rotation, so verification is a local operation.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  jwks ??= createRemoteJWKSet(GOOGLE_JWKS_URL);
  return jwks;
}

export type GoogleIdentity = {
  /** Google's stable account id - the `providerAccountId` we link on. */
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

export type GoogleIdTokenFailure =
  | "not-configured"
  | "invalid-token"
  | "email-unverified";

export type GoogleIdTokenResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; reason: GoogleIdTokenFailure };

/** Just the env this reads, so tests can hand it a plain object. */
export type GoogleClientEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_IOS_CLIENT_ID?: string;
};

/**
 * Every OAuth client that may sign a token we accept.
 *
 * Only two, because only two ever appear in `aud`: iOS tokens carry the iOS
 * client id, and Android tokens carry the web ("server") client id - Android's
 * own OAuth client is matched on package name plus signing certificate and is
 * never named in a token. The web client also covers an Expo web build.
 *
 * Client ids are public identifiers, not secrets - the signature is what makes
 * the token trustworthy.
 */
export function googleAudiences(
  env: GoogleClientEnv = process.env as GoogleClientEnv
): string[] {
  const ids = [env.GOOGLE_CLIENT_ID, env.GOOGLE_IOS_CLIENT_ID]
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id));

  return [...new Set(ids)];
}

/**
 * Narrows a verified token's claims to the identity we store. Split out from
 * the signature check so the claim rules can be tested without network or keys.
 *
 * `email_verified` must be true for the same reason it must on the web (see
 * `isOAuthSignInAllowed`): an unverified Google address would let someone walk
 * straight past the email-verification gate credentials accounts go through.
 */
export function readGoogleClaims(payload: JWTPayload): GoogleIdTokenResult {
  const claims = payload as JWTPayload & {
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
    picture?: unknown;
  };

  const sub = typeof claims.sub === "string" ? claims.sub.trim() : "";
  const email = typeof claims.email === "string" ? claims.email.trim() : "";
  if (!sub || !email) return { ok: false, reason: "invalid-token" };

  // Google sends this as a boolean, but has historically sent the string
  // "true" on some surfaces - accept both, and nothing else.
  const verified =
    claims.email_verified === true || claims.email_verified === "true";
  if (!verified) return { ok: false, reason: "email-unverified" };

  return {
    ok: true,
    identity: {
      sub,
      email,
      name: typeof claims.name === "string" ? claims.name : null,
      picture: typeof claims.picture === "string" ? claims.picture : null,
    },
  };
}

/** Verifies a Google ID token and returns the identity it vouches for. */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<GoogleIdTokenResult> {
  const audience = googleAudiences();
  // With no client ids configured every token would verify against an empty
  // audience list, so refuse outright rather than accept tokens minted for
  // somebody else's app.
  if (audience.length === 0) return { ok: false, reason: "not-configured" };

  try {
    const { payload } = await jwtVerify(idToken, getJwks(), {
      issuer: GOOGLE_ISSUERS,
      audience,
    });
    return readGoogleClaims(payload);
  } catch {
    // Bad signature, wrong audience, expired - all the same to the caller.
    return { ok: false, reason: "invalid-token" };
  }
}
