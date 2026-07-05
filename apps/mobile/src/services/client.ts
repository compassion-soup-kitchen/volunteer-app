/**
 * Service-layer base.
 *
 * When `EXPO_PUBLIC_API_URL` is set, services call the web app's mobile API
 * (`/api/v1/*`) with a bearer token issued at login. Without it, every service
 * resolves against the in-memory mock (`src/data/mock-db`) so the app keeps
 * working offline and in development.
 */

export const API_BASE: string | null =
  (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '') || null;

/** True while we're running against mock fixtures rather than a live API. */
export const USE_MOCK = !API_BASE;

/** Simulates a little network latency so loading states are exercised. */
export function delay(ms = 320): Promise<void> {
  const jitter = Math.round((Math.random() - 0.5) * 120);
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms + jitter)));
}

/** Raised for non-2xx API responses, carrying the server's error message. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// The bearer token lives in module state; auth-service persists it in
// SecureStore and rehydrates it on launch via setAuthToken().
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error('No API base configured');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body - keep the generic message.
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/** Folds a thrown API/network error into the `{ error }` shape mutations return. */
export function toActionError(err: unknown): { error: string } {
  if (err instanceof ApiError) return { error: err.message };
  return { error: 'Could not reach the server. Please check your connection and try again.' };
}
