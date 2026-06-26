/**
 * Service-layer base.
 *
 * Today every service resolves against the in-memory mock (`src/data/mock-db`).
 * When the web app exposes a JSON API, set `EXPO_PUBLIC_API_URL` and replace the
 * mock bodies with calls to `apiFetch()` — the screens won't change.
 */

export const API_BASE: string | null = process.env.EXPO_PUBLIC_API_URL ?? null;

/** True while we're running against mock fixtures rather than a live API. */
export const USE_MOCK = !API_BASE;

/** Simulates a little network latency so loading states are exercised. */
export function delay(ms = 320): Promise<void> {
  const jitter = Math.round((Math.random() - 0.5) * 120);
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms + jitter)));
}

/** Thin wrapper for the future real API. Unused while `USE_MOCK` is true. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error('No API base configured');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}
