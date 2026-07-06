/**
 * Push token registration.
 *
 * Sends the device's Expo push token to the web API so the server can
 * notify this volunteer. In mock mode there is no server to deliver
 * pushes, so both calls are no-ops.
 */

import { apiFetch, USE_MOCK } from './client';

// The token we last registered, kept so sign-out can unregister it while
// the bearer token is still valid.
let currentToken: string | null = null;

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  currentToken = token;
  if (USE_MOCK) return;
  try {
    await apiFetch('/api/v1/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  } catch {
    // Best-effort — we re-register on the next launch.
  }
}

export async function unregisterPushToken(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  if (!token || USE_MOCK) return;
  try {
    await apiFetch('/api/v1/push-tokens', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  } catch {
    // The server prunes dead tokens when a send bounces, so this is harmless.
  }
}
