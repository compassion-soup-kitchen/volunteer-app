/**
 * Verification for Apple identity tokens presented by the mobile app.
 *
 * The native app runs Apple's own sign-in sheet, so it holds an identity token
 * rather than a password. It posts that token to `/api/v1/auth/apple`, and we
 * re-verify it here from scratch - signature against Apple's published keys,
 * issuer, audience, expiry - before trusting a single claim inside it. The
 * shape deliberately mirrors `@/lib/google-id-token`; where it differs, Apple
 * does.
 *
 * Two Apple-specific facts drive the design:
 *
 * 1. **The name is not in the token.** Apple returns the person's name to the
 *    *client*, once, on the very first authorisation, and never again - not
 *    even if the app is deleted and reinstalled. So the name arrives as a
 *    separate, client-supplied field (see `/api/v1/auth/apple`) and is only
 *    ever used to label a brand-new account.
 * 2. **The email may be a relay, or absent.** Someone who chooses "Hide My
 *    Email" gets a `@privaterelay.appleid.com` address that forwards to their
 *    real one; the sending domain must be registered with Apple or that mail
 *    silently bounces. And on subsequent sign-ins Apple may omit `email`
 *    entirely, which is why `sub` - stable forever for this app - is the only
 *    thing we link accounts on.
 */

import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
} from "jose";

const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");

const APPLE_ISSUER = "https://appleid.apple.com";

// Cached across requests: the remote key set fetches Apple's signing keys once
// and refreshes them on rotation, so verification is a local operation.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  jwks ??= createRemoteJWKSet(APPLE_JWKS_URL);
  return jwks;
}

export type AppleIdentity = {
  /** Apple's stable per-app account id - the `providerAccountId` we link on. */
  sub: string;
  /**
   * Null when Apple withholds it, which it does on every sign-in after the
   * first. Callers must fall back to the linked account rather than treat a
   * missing address as a new person.
   */
  email: string | null;
  /** True for a `@privaterelay.appleid.com` forwarding address. */
  isPrivateEmail: boolean;
};

export type AppleIdTokenFailure =
  | "not-configured"
  | "invalid-token"
  | "email-unverified";

export type AppleIdTokenResult =
  | { ok: true; identity: AppleIdentity }
  | { ok: false; reason: AppleIdTokenFailure };

/** Just the env this reads, so tests can hand it a plain object. */
export type AppleClientEnv = {
  APPLE_CLIENT_ID?: string;
};

/**
 * Every client id that may appear in `aud`.
 *
 * For a native iOS sign-in that is the app's bundle identifier
 * (`nz.org.compassion.volunteer`), not a Services ID - a Services ID is what a
 * *web* Sign in with Apple flow would use, and we have none. Comma-separated so
 * a future Services ID or a second bundle id can be added without a code
 * change.
 *
 * Client ids are public identifiers, not secrets - the signature is what makes
 * the token trustworthy.
 */
export function appleAudiences(
  env: AppleClientEnv = process.env as AppleClientEnv
): string[] {
  const ids = (env.APPLE_CLIENT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return [...new Set(ids)];
}

/**
 * Narrows a verified token's claims to the identity we store. Split out from
 * the signature check so the claim rules can be tested without network or keys.
 *
 * `email_verified` is only judged when an email is actually present. Apple
 * sends it as the string `"true"` more often than the boolean, and omits both
 * it and the address on repeat sign-ins - in which case there is nothing to
 * verify and the linked account is the source of truth for the address.
 */
export function readAppleClaims(payload: JWTPayload): AppleIdTokenResult {
  const claims = payload as JWTPayload & {
    email?: unknown;
    email_verified?: unknown;
    is_private_email?: unknown;
  };

  const sub = typeof claims.sub === "string" ? claims.sub.trim() : "";
  if (!sub) return { ok: false, reason: "invalid-token" };

  const email = typeof claims.email === "string" ? claims.email.trim() : "";

  if (email) {
    // Same gate as Google's: an unverified address would let someone walk past
    // the email-verification step credentials accounts go through. A relay
    // address is always verified - Apple owns the mailbox.
    const verified =
      claims.email_verified === true || claims.email_verified === "true";
    if (!verified) return { ok: false, reason: "email-unverified" };
  }

  return {
    ok: true,
    identity: {
      sub,
      email: email || null,
      isPrivateEmail:
        claims.is_private_email === true || claims.is_private_email === "true",
    },
  };
}

/**
 * Renders untrusted text safe to put in a log line.
 *
 * Everything the diagnosis below quotes came out of an *unverified* token, so
 * a hostile caller chooses it freely - and a claim carrying newlines would
 * otherwise let them write extra lines into the log, forging entries for
 * whoever is triaging it (CWE-117). `JSON.stringify` both escapes the control
 * characters and delimits the value, so its extent is never in doubt.
 */
function quoted(value: string): string {
  return JSON.stringify(value);
}

/**
 * Explains, for the server log alone, why a token was refused. The API answers
 * one deliberately opaque "we couldn't verify that" for every failure, which is
 * right for the client and useless for whoever has to work out why sign-in
 * stopped working.
 */
export function describeRejectedAppleToken(
  claims: JWTPayload | null,
  env: AppleClientEnv,
  error: unknown
): string {
  if (!claims) return "not a well-formed JWT";

  const configured = appleAudiences(env);
  const audience = [claims.aud]
    .flat()
    .filter((aud): aud is string => typeof aud === "string" && aud.length > 0);

  // The client ids are our own env and go in bare; everything else here was
  // written by whoever sent the token, so it is quoted.
  if (audience.length > 0 && !audience.some((aud) => configured.includes(aud))) {
    const hint = configured.length
      ? ""
      : " - APPLE_CLIENT_ID is not set, so no audience is accepted at all";
    return (
      `audience ${audience.map(quoted).join(", ")} is not a client id this ` +
      `server accepts (accepting ${configured.join(", ") || "nothing"})${hint}`
    );
  }

  if (typeof claims.iss === "string" && claims.iss !== APPLE_ISSUER) {
    return `issuer ${quoted(claims.iss)} is not Apple`;
  }

  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    `signature or claim check failed${code ? ` [${quoted(code)}]` : ""}: ` +
    quoted(message)
  );
}

/** The token's own claims, unverified - for diagnostics only, never trusted. */
function decodeUnverified(idToken: string): JWTPayload | null {
  try {
    return decodeJwt(idToken);
  } catch {
    return null;
  }
}

/** Verifies an Apple identity token and returns the identity it vouches for. */
export async function verifyAppleIdToken(
  idToken: string
): Promise<AppleIdTokenResult> {
  const env = process.env as AppleClientEnv;
  const audience = appleAudiences(env);
  // With no client id configured every token would verify against an empty
  // audience list, so refuse outright rather than accept tokens minted for
  // somebody else's app.
  if (audience.length === 0) return { ok: false, reason: "not-configured" };

  try {
    const { payload } = await jwtVerify(idToken, getJwks(), {
      issuer: APPLE_ISSUER,
      audience,
    });
    return readAppleClaims(payload);
  } catch (error) {
    console.warn(
      "[apple-id-token] refused a token:",
      describeRejectedAppleToken(decodeUnverified(idToken), env, error)
    );
    return { ok: false, reason: "invalid-token" };
  }
}
