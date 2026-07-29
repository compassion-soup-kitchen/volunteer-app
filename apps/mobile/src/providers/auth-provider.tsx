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
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error?: string; pendingVerification?: boolean }>;
  signOut: () => Promise<void>;
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

  const value = useMemo<AuthState>(
    () => ({ user, initializing, signIn, signInWithGoogle, signUp, signOut }),
    [user, initializing, signIn, signInWithGoogle, signUp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
