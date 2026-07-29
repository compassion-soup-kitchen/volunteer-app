/**
 * Auth service.
 *
 * Against the real API (`EXPO_PUBLIC_API_URL` set) this signs in via
 * `/api/v1/auth/*` - with an email and password, or with a Google ID token
 * from the native sheet - stores the bearer token + user in SecureStore, and
 * refreshes the user from `/api/v1/me` on launch so role changes (e.g. an
 * approved application) are picked up. In mock mode it signs the user in as
 * the seeded volunteer.
 *
 * SecureStore is unavailable on web, so all storage calls degrade gracefully
 * to an in-memory session there.
 */

import * as SecureStore from 'expo-secure-store';

import { db, nextId, SEED_USER } from '@/data/mock-db';
import type { SessionUser } from '@/types/models';

import { apiFetch, ApiError, delay, setAuthToken, toActionError, USE_MOCK } from './client';
import { GOOGLE_SIGN_IN_CONFIGURED, signInWithGoogle, signOutFromGoogle } from './google-sign-in';

/**
 * Whether to offer the Google button at all. Mock mode always offers it (it
 * signs in as the seeded volunteer); a real build only does so once the app
 * has Google client ids, so an unconfigured build shows email sign-in alone
 * rather than a button that could only fail.
 */
export const GOOGLE_SIGN_IN_AVAILABLE = USE_MOCK || GOOGLE_SIGN_IN_CONFIGURED;

const SESSION_KEY = 'csk.session';
const TOKEN_KEY = 'csk.token';

async function readItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeItem(key: string, value: string | null): Promise<void> {
  try {
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Web / unsupported platforms - session stays in memory only.
  }
}

async function persist(user: SessionUser | null, token: string | null): Promise<void> {
  await writeItem(SESSION_KEY, user ? JSON.stringify(user) : null);
  await writeItem(TOKEN_KEY, token);
}

export interface AuthResult {
  user?: SessionUser;
  error?: string;
  /** Set when the account was created but a verification email must be clicked before signing in. */
  pendingVerification?: boolean;
  /** Set when the person backed out of Google's sheet - nothing to report. */
  cancelled?: boolean;
}

type AuthResponse = { token: string; user: SessionUser };
type RegisterResponse = Partial<AuthResponse> & { requiresVerification?: boolean };

/** Restores a persisted session on launch. */
export async function getStoredSession(): Promise<SessionUser | null> {
  const raw = await readItem(SESSION_KEY);
  const stored = raw ? (JSON.parse(raw) as SessionUser) : null;

  if (USE_MOCK) {
    if (stored) db.session = stored;
    return stored ?? db.session;
  }

  const token = await readItem(TOKEN_KEY);
  if (!token) return null;
  setAuthToken(token);

  // Refresh the user so role/name changes land; fall back to the stored copy
  // when offline. Only a rejected token (401) signs the volunteer out.
  try {
    const { user } = await apiFetch<{ user: SessionUser }>('/api/v1/me');
    await writeItem(SESSION_KEY, JSON.stringify(user));
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setAuthToken(null);
      await persist(null, null);
      return null;
    }
    return stored;
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (!e || !e.includes('@')) return { error: 'Please enter a valid email address.' };
  if (!password) return { error: 'Please enter your password.' };

  if (USE_MOCK) {
    await delay();
    const user: SessionUser = { ...SEED_USER, email: e };
    db.session = user;
    await persist(user, null);
    return { user };
  }

  try {
    const { token, user } = await apiFetch<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: e, password }),
    });
    setAuthToken(token);
    await persist(user, token);
    return { user };
  } catch (err) {
    return toActionError(err);
  }
}

/**
 * Signs in with Google: the native sheet issues an ID token, and the API
 * verifies it before handing back the same bearer token a password sign-in
 * would. Doubles as sign-up - a first-time Google account is created there as
 * a PUBLIC applicant, exactly like registering by email.
 */
export async function loginWithGoogle(): Promise<AuthResult> {
  if (USE_MOCK) {
    await delay();
    const user: SessionUser = { ...SEED_USER };
    db.session = user;
    await persist(user, null);
    return { user };
  }

  const outcome = await signInWithGoogle();
  if (outcome.type === 'cancelled') return { cancelled: true };
  if (outcome.type === 'error') return { error: outcome.message };

  try {
    const { token, user } = await apiFetch<AuthResponse>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: outcome.idToken }),
    });
    setAuthToken(token);
    await persist(user, token);
    return { user };
  } catch (err) {
    // The device is signed in to Google but we aren't signed in to the app;
    // clear it so a retry starts from the account picker rather than silently
    // reusing the account that was just refused.
    await signOutFromGoogle();
    return toActionError(err);
  }
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  const n = name.trim();
  const e = email.trim().toLowerCase();
  if (n.length < 2) return { error: 'Please tell us your name.' };
  if (!e || !e.includes('@')) return { error: 'Please enter a valid email address.' };
  if (password.length < 8) return { error: 'Use at least 8 characters for your password.' };

  if (USE_MOCK) {
    await delay();
    // New accounts start as PUBLIC applicants - the app routes them into the
    // volunteer application until staff approve them (mirrors the web flow).
    // No email exists in mock mode, so verification is skipped entirely.
    const user: SessionUser = { id: nextId('usr'), name: n, email: e, role: 'PUBLIC' };
    db.session = user;
    db.application = null;
    await persist(user, null);
    return { user };
  }

  try {
    const res = await apiFetch<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: n, email: e, password }),
    });
    // With email configured the API withholds the token until the emailed
    // verification link is clicked; the person then signs in normally.
    if (res.requiresVerification || !res.token || !res.user) {
      return { pendingVerification: true };
    }
    setAuthToken(res.token);
    await persist(res.user, res.token);
    return { user: res.user };
  } catch (err) {
    return toActionError(err);
  }
}

export async function logout(): Promise<void> {
  db.session = null;
  setAuthToken(null);
  await signOutFromGoogle();
  await persist(null, null);
}
