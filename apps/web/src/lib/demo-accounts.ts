/**
 * Seeded demo accounts for one-click sign-in.
 *
 * These credentials live here - never in a client component - because a client
 * module can't be tree-shaken by a runtime flag: anything it references is
 * compiled into the browser bundle for every build, production included. Only
 * the role key crosses the network; `demoLogin` in `auth-actions.ts` looks up
 * the password server-side and re-checks `demoLoginsEnabled()` itself.
 *
 * This file has no "use server" directive so it can export plain values and a
 * sync predicate (a "use server" module may only export async functions).
 */

export const DEMO_ACCOUNTS = {
  admin: { email: "admin@soupkitchen.org.nz", password: "admin123!" },
  coordinator: { email: "coordinator@soupkitchen.org.nz", password: "coord123!" },
  volunteer: { email: "volunteer@soupkitchen.org.nz", password: "volunteer123!" },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

/**
 * On by default in `next dev`; switch it on for a non-production deploy
 * (staging, previews) with DEMO_LOGINS=true. Never set that in production -
 * these accounts have well-known passwords.
 */
export function demoLoginsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.DEMO_LOGINS === "true"
  );
}
