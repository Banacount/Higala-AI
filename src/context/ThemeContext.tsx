import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getSystemTheme,
  normalizeThemePreference,
  resolveTheme,
  subscribeToSystemTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  /** User's saved choice: `'system'` (auto), `'light'`, or `'dark'`. */
  preference: ThemePreference;
  /** Current theme detected from the browser's `prefers-color-scheme`. */
  systemTheme: ResolvedTheme;
  /** Effective theme actually applied to the document (`'light'` or `'dark'`). */
  resolvedTheme: ResolvedTheme;
  /** Convenience flag for components needing conditional dark rendering. */
  isDark: boolean;
  /** Sets a specific preference (`'system'`, `'light'`, or `'dark'`). */
  setPreference: (nextPreference: ThemePreference) => void;
  /** Toggles between light and dark based on the currently visible theme. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [storedPreference, setStoredPreference] = useLocalStorage<ThemePreference>(
    THEME_STORAGE_KEY,
    'system',
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const preference = normalizeThemePreference(storedPreference);
  const resolvedTheme = resolveTheme(preference, systemTheme);

  // Stay synced with browser/OS theme changes whenever the app is open.
  useEffect(() => {
    return subscribeToSystemTheme(setSystemTheme);
  }, []);

  // Apply the resolved theme to `<html>` whenever preference or browser theme changes.
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback(
    (nextPreference: ThemePreference) => {
      setStoredPreference(normalizeThemePreference(nextPreference));
    },
    [setStoredPreference],
  );

  const toggleTheme = useCallback(() => {
    setStoredPreference((current) => {
      const currentResolved = resolveTheme(
        normalizeThemePreference(current),
        systemTheme,
      );
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  }, [setStoredPreference, systemTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      systemTheme,
      resolvedTheme,
      isDark: resolvedTheme === 'dark',
      setPreference,
      toggleTheme,
    }),
    [preference, systemTheme, resolvedTheme, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the active theme state and controls from `ThemeProvider`.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}
