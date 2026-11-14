export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'higala.theme.v1';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const LIGHT_THEME_COLOR = '#0B3B2E';
const DARK_THEME_COLOR = '#062018';

/**
 * Validates any raw value read from storage or external state into a safe ThemePreference.
 */
export function normalizeThemePreference(value: unknown): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

/**
 * Reads the browser/OS color scheme preference using `matchMedia`.
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
}

/**
 * Resolves the active theme (`light` or `dark`) from user preference and browser preference.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference;
}

/**
 * Applies the resolved theme class, `color-scheme`, and mobile `<meta name="theme-color">`
 * directly to the document root so Tailwind `dark:` variants and native controls stay in sync.
 */
export function applyThemeToDocument(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  const isDark = theme === 'dark';
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = theme;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
    );
  }
}

/**
 * Subscribes to live browser `prefers-color-scheme` changes and returns an unsubscribe handler.
 */
export function subscribeToSystemTheme(
  onChange: (nextSystemTheme: ResolvedTheme) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
  const handleChange = (event: MediaQueryListEvent) => {
    onChange(event.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}
