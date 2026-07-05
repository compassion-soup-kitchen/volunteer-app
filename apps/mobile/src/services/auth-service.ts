/**
 * Auth service.
 *
 * Against the real API (`EXPO_PUBLIC_API_URL` set) this signs in via
 * `/api/v1/auth/*`, stores the bearer token + user in SecureStore, and
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
}

type AuthResponse = { token: string; user: SessionUser };

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
    const user: SessionUser = { id: nextId('usr'), name: n, email: e, role: 'PUBLIC' };
    db.session = user;
    db.application = null;
    await persist(user, null);
    return { user };
  }

  try {
    const { token, user } = await apiFetch<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: n, email: e, password }),
    });
    setAuthToken(token);
    await persist(user, token);
    return { user };
  } catch (err) {
    return toActionError(err);
  }
}

export async function logout(): Promise<void> {
  db.session = null;
  setAuthToken(null);
  await persist(null, null);
}
