import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from 'react';

import * as authService from '@/services/auth-service';
import type { SessionUser } from '@/types/models';

interface AuthState {
  user: SessionUser | null;
  /** True until the persisted session has been restored on launch */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
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

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await authService.register(name, email, password);
    if (result.user) setUser(result.user);
    return { error: result.error };
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, initializing, signIn, signUp, signOut }),
    [user, initializing, signIn, signUp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
