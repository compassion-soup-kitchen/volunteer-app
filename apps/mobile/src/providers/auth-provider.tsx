import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from 'react';

import * as authService from '@/services/auth-service';
import { unregisterPushToken } from '@/services/push-service';
import type { SessionUser } from '@/types/models';

interface AuthState {
  user: SessionUser | null;
  /** True until the persisted session has been restored on launch */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /** Google sign-in, which doubles as sign-up for a first-time account. */
  signInWithGoogle: () => Promise<{ error?: string; cancelled?: boolean }>;
  /** Sign in with Apple, likewise doubling as sign-up. */
  signInWithApple: () => Promise<{ error?: string; cancelled?: boolean }>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error?: string; pendingVerification?: boolean }>;
  signOut: () => Promise<void>;
  /**
   * Permanently erase this account. Signs out on success, so the app falls
   * back to the sign-in screen through the same guard as `signOut`.
   */
  deleteAccount: (confirmation: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    authService.getStoredSession().then((restored) => {
      if (active) {
        setUser(restored);
        setInitializing(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.user) setUser(result.user);
    return { error: result.error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await authService.loginWithGoogle();
    if (result.user) setUser(result.user);
    return { error: result.error, cancelled: result.cancelled };
  }, []);

  const signInWithApple = useCallback(async () => {
    const result = await authService.loginWithApple();
    if (result.user) setUser(result.user);
    return { error: result.error, cancelled: result.cancelled };
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await authService.register(name, email, password);
    if (result.user) setUser(result.user);
    return { error: result.error, pendingVerification: result.pendingVerification };
  }, []);

  const signOut = useCallback(async () => {
    // Stop notifying this device while the bearer token is still valid.
    await unregisterPushToken();
    await authService.logout();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (confirmation: string) => {
    // No `unregisterPushToken` here, unlike sign-out: `PushToken` cascades
    // away with the user, and clearing the device's token up front would leave
    // it unregistered until the next launch if the confirmation is refused.
    const result = await authService.deleteAccount(confirmation);
    // Only clear the session once the account has actually gone; a refused
    // confirmation leaves the person signed in to try again.
    if (!result.error) setUser(null);
    return result;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signUp,
      signOut,
      deleteAccount,
    }),
    [
      user,
      initializing,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signUp,
      signOut,
      deleteAccount,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
