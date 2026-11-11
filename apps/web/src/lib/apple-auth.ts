/**
 * Pure helpers for the website's Sign in with Apple, kept out of the NextAuth
 * config so they can be unit-tested without running an OAuth round trip.
 *
 * The app's Apple sign-in (`/api/v1/auth/apple`) and this one land on the same
 * accounts: both link on an `Account` row with provider `"apple"` and Apple's
 * `sub`. That only holds because the Services ID is grouped under the app's
 * primary App ID in the Apple developer portal - Apple then issues the same
 * `sub` to both clients. Without that grouping a person would get two
 * different accounts depending on where they first signed in.
 */

import type { Role } from "@prisma/client";
import { normalizeEmail } from "./data/users";

/**
 * Apple's ID token claims, plus the `user` field Auth.js copies in from the
 * form Apple posts back. That field exists on the very first authorisation
 * only - it is the one and only time Apple says the person's name.
 */
export type AppleProfileClaims = {
  sub: string;
  email?: string | null;
  email_verified?: boolean | "true" | "false" | null;
  user?: {
    name?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

/** Apple sends booleans as strings as often as not. */
export function isAppleEmailVerified(value: unknown): boolean {
  return value === true || value === "true";
}

/**
 * Maps Apple's claims into our User shape.
 *
 * Auth.js's own mapping is not usable: it builds the name as
 * `` `${firstName} ${lastName}` `` - "undefined undefined" when someone shares
 * only one part - and otherwise falls back to the *email address* as the
 * name, which would greet relay users as "x7f2…@privaterelay.appleid.com".
 * No name is better than either; the application form asks for it anyway.
 */
export function appleProfileToUser(profile: AppleProfileClaims) {
  const parts = [profile.user?.name?.firstName, profile.user?.name?.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const email = profile.email?.trim();

  return {
    id: profile.sub,
    name: parts.length ? parts.join(" ") : null,
    // Lower-cased like every other path into `User.email`, so the app and the
    // website can't create two accounts that differ only by case.
    email: email ? normalizeEmail(email) : null,
    image: null,
    role: "PUBLIC" as Role,
  };
}

type CookieOptions = {
  httpOnly: boolean;
  sameSite: "lax" | "none";
  path: string;
  secure: boolean;
  maxAge?: number;
};

/**
 * Cookie overrides that let Apple's callback through.
 *
 * Asking Apple for name and email obliges `response_mode=form_post`: Apple's
 * page POSTs the result back to us from appleid.apple.com. Browsers don't send
 * `SameSite=Lax` cookies on a cross-site POST, so Auth.js's defaults lose the
 * `state` and `nonce` it set on the way out and refuse the callback - and the
 * `callback-url` cookie, which would land the person on the home page instead
 * of where they were going. These three are therefore `SameSite=None`.
 *
 * That is only allowed alongside `Secure`, so over plain http (local dev) the
 * defaults stand - Apple won't redirect to a non-https URL anyway. The session
 * and CSRF cookies are untouched. Each override is single-use, httpOnly and
 * short-lived, which is what makes relaxing them safe.
 */
export function appleFormPostCookies(useSecureCookies: boolean) {
  if (!useSecureCookies) return undefined;

  const prefix = "__Secure-";
  const crossSite = (maxAge?: number): CookieOptions => ({
    httpOnly: true,
    sameSite: "none",
    path: "/",
    secure: true,
    ...(maxAge ? { maxAge } : {}),
  });

  return {
    state: { name: `${prefix}authjs.state`, options: crossSite(60 * 15) },
    nonce: { name: `${prefix}authjs.nonce`, options: crossSite(60 * 15) },
    callbackUrl: { name: `${prefix}authjs.callback-url`, options: crossSite() },
  };
}

/**
 * Whether Auth.js will use secure (`__Secure-`) cookies for this request, so
 * the overrides above agree with it on the cookie names.
 *
 * Mirrors Auth.js: it swaps the request's origin for `AUTH_URL` /
 * `NEXTAUTH_URL` when one is set, then goes secure exactly when the resulting
 * URL is https.
 */
export function usesSecureCookies(
  requestUrl: string | undefined,
  env: { AUTH_URL?: string; NEXTAUTH_URL?: string } = process.env as {
    AUTH_URL?: string;
    NEXTAUTH_URL?: string;
  }
): boolean {
  const url = env.AUTH_URL ?? env.NEXTAUTH_URL ?? requestUrl ?? "";
  return url.startsWith("https://");
}
