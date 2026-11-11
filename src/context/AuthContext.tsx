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
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [status, setStatus] = useState<AuthStatus>(
    configured ? 'loading' : 'unavailable',
  );
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

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
        if (nextUser) {
          setStatus('ready');
          setError(null);
          void nextUser
            .getIdTokenResult()
            .then((result) => {
              if (!cancelled) {
                setIsAdmin(result.claims.admin === true);
              }
            })
            .catch(() => {
              if (!cancelled) setIsAdmin(false);
            });
        }
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
      retry,
    }),
    [status, configured, user, isAdmin, error, getIdToken, retry],
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
