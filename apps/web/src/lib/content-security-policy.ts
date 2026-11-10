/**
 * The page Content-Security-Policy, built per request by `src/proxy.ts`.
 *
 * Scripts are allowed by nonce, not by origin: Next.js reads the nonce back out
 * of the request's CSP header and stamps it on every framework script, and
 * `'strict-dynamic'` passes that trust on to scripts those load - which is how
 * the Google Maps loader in `address-autocomplete.tsx` gets in without its
 * origin being listed. A nonce only works on a dynamically rendered page, so
 * the root layout reads it with `headers()`, which keeps every page dynamic.
 *
 * Styles keep `'unsafe-inline'`. React server-renders `style` props as
 * attributes, and Radix, motion, sonner and Google Maps all set inline styles;
 * a nonce can't cover an attribute, and listing one would switch
 * `'unsafe-inline'` off. Inline styles can't run code, so this is the usual
 * trade.
 *
 * Every other origin the browser talks to is listed here. When you add a third
 * party, add its origins to the narrowest directive that works.
 */

/** Sites allowed to frame the app: awhinatech.nz embeds it in its showcase. */
const FRAME_ANCESTORS = ["'self'", "https://awhinatech.nz", "https://*.awhinatech.nz"];

/** Google profile pictures (Google sign-in stores `profile.picture`). */
const GOOGLE_AVATARS = "https://lh3.googleusercontent.com";

/** Places autocomplete on the application form. */
const GOOGLE_MAPS_IMAGES = ["https://maps.gstatic.com", "https://maps.googleapis.com"];
const GOOGLE_MAPS_API = ["https://maps.googleapis.com", "https://places.googleapis.com"];

export interface ContentSecurityPolicyOptions {
  nonce: string;
  /** React needs `eval` in development to rebuild server error stacks. */
  isDev: boolean;
}

export function buildContentSecurityPolicy({
  nonce,
  isDev,
}: ContentSecurityPolicyOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", GOOGLE_AVATARS, ...GOOGLE_MAPS_IMAGES],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...GOOGLE_MAPS_API],
    "frame-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": FRAME_ANCESTORS,
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");
}

/** A fresh, unguessable nonce: 128 random bits, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
