import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { useSetAdminStatus } from '@/context/AdminStatusContext';
import {
  ensureAnonymousUser,
  getFirebaseClientAuth,
  isFirebaseConfigured,
} from '@/lib/firebase';

export type AuthStatus = 'loading' | 'ready' | 'unavailable' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  configured: boolean;
  user: User | null;
  isAdmin: boolean;
  error: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  refreshAdminAccess: () => Promise<boolean>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const setAdminStatus = useSetAdminStatus();
  const [status, setStatus] = useState<AuthStatus>(
    configured ? 'loading' : 'unavailable',
  );
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAdminStatus(isAdmin);
  }, [isAdmin, setAdminStatus]);

  useEffect(() => {
    if (!configured) {
      setStatus('unavailable');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setError(null);

    let auth;
    try {
      auth = getFirebaseClientAuth();
    } catch (cause) {
      setStatus('error');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Community sign-in is unavailable.',
      );
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(
      (nextUser) => {
        if (cancelled) return;
        setUser(nextUser);
        if (!nextUser) {
          setIsAdmin(false);
          return;
        }

        setStatus('ready');
        setError(null);

        // Custom claims (like `admin`) do not appear in an ID token that was
        // minted before the claim was granted. The SDK can reuse that cached
        // token across reloads, so read it once for a fast first paint and then
        // force a refresh so operator-granted access shows up without waiting
        // for the token to expire.
        void (async () => {
          let sawToken = false;
          try {
            const cached = await nextUser.getIdTokenResult();
            if (cancelled) return;
            sawToken = true;
            setIsAdmin(cached.claims.admin === true);
          } catch {
            // Fall through to the forced refresh below.
          }

          try {
            const fresh = await nextUser.getIdTokenResult(true);
            if (cancelled) return;
            sawToken = true;
            setIsAdmin(fresh.claims.admin === true);
          } catch {
            // Offline or refresh failure: keep whatever the cached token said.
          }

          if (!sawToken && !cancelled) setIsAdmin(false);
        })();
      },
      (cause) => {
        if (cancelled) return;
        setStatus('error');
        setError(
          cause instanceof Error
            ? cause.message
            : 'Community sign-in is unavailable.',
        );
      },
    );

    void ensureAnonymousUser().catch((cause: unknown) => {
      if (cancelled) return;
      setStatus('error');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Community sign-in is unavailable.',
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured, attempt]);

  const getIdToken = useCallback(async (forceRefresh = false) => {
    const auth = getFirebaseClientAuth();
    const current = auth.currentUser ?? (await ensureAnonymousUser());
    return current.getIdToken(forceRefresh);
  }, []);

  const refreshAdminAccess = useCallback(async () => {
    const auth = getFirebaseClientAuth();
    const current = auth.currentUser ?? (await ensureAnonymousUser());
    const result = await current.getIdTokenResult(true);
    const admin = result.claims.admin === true;
    setIsAdmin(admin);
    return admin;
  }, []);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      configured,
      user,
      isAdmin,
      error,
      getIdToken,
      refreshAdminAccess,
      retry,
    }),
    [
      status,
      configured,
      user,
      isAdmin,
      error,
      getIdToken,
      refreshAdminAccess,
      retry,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return value;
}
