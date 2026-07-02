/**
 * Auth service (mock).
 *
 * Signs the user in as the seeded volunteer and persists a lightweight session
 * token in SecureStore. SecureStore is unavailable on web, so all storage calls
 * degrade gracefully to an in-memory session there.
 */

import * as SecureStore from 'expo-secure-store';

import { db, nextId, SEED_USER } from '@/data/mock-db';
import type { SessionUser } from '@/types/models';

import { delay } from './client';

const SESSION_KEY = 'csk.session';

async function persist(user: SessionUser | null): Promise<void> {
  try {
    if (user) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Web / unsupported platforms - session stays in memory only.
  }
}

export interface AuthResult {
  user?: SessionUser;
  error?: string;
}

/** Restores a persisted session on launch. */
export async function getStoredSession(): Promise<SessionUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (raw) {
      const user = JSON.parse(raw) as SessionUser;
      db.session = user;
      return user;
    }
  } catch {
    // ignore
  }
  return db.session;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  await delay();
  const e = email.trim().toLowerCase();
  if (!e || !e.includes('@')) return { error: 'Please enter a valid email address.' };
  if (!password) return { error: 'Please enter your password.' };

  const user: SessionUser = { ...SEED_USER, email: e };
  db.session = user;
  await persist(user);
  return { user };
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  await delay();
  const n = name.trim();
  const e = email.trim().toLowerCase();
  if (n.length < 2) return { error: 'Please tell us your name.' };
  if (!e || !e.includes('@')) return { error: 'Please enter a valid email address.' };
  if (password.length < 8) return { error: 'Use at least 8 characters for your password.' };

  // New accounts start as PUBLIC applicants - the app routes them into the
  // volunteer application until staff approve them (mirrors the web flow).
  const user: SessionUser = { id: nextId('usr'), name: n, email: e, role: 'PUBLIC' };
  db.session = user;
  db.application = null;
  await persist(user);
  return { user };
}

export async function logout(): Promise<void> {
  db.session = null;
  await persist(null);
}
