import clsx from 'clsx';
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePreference } from '@/lib/theme';

interface ThemeSwitchProps {
  /** Visual variant matching the dark sidebar, light/dark header, or compact toolbar. */
  surface?: 'sidebar' | 'surface';
  /** Optional click label for compact mobile bar vs full sidebar row. */
  compact?: boolean;
  className?: string;
}

/**
 * Accessible toggle switch for flipping between Light and Dark mode,
 * with a small "Auto" reset option when overridden from the browser preference.
 */
export function ThemeSwitch({
  surface = 'surface',
  compact = false,
  className,
}: ThemeSwitchProps) {
  const { isDark, preference, systemTheme, toggleTheme, setPreference } =
    useTheme();
  const isSidebar = surface === 'sidebar';
  const modeLabel =
    preference === 'system'
      ? `Auto (${systemTheme})`
      : isDark
        ? 'Dark mode'
        : 'Light mode';

  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={`${modeLabel} — tap to toggle`}
        onClick={toggleTheme}
        className={clsx(
          'relative inline-flex h-9 w-[3.75rem] shrink-0 items-center rounded-full border p-1 transition-colors duration-200',
          isDark
            ? 'border-pine-300/25 bg-pine-900 text-pine-100'
            : 'border-pine-900/12 bg-white/75 text-pine-900',
          className,
        )}
      >
        <span
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-full shadow-xs transition-transform duration-200',
            isDark
              ? 'translate-x-6 bg-pine-300 text-pine-950'
              : 'translate-x-0 bg-pine-900 text-cream',
          )}
        >
          {isDark ? (
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Sun className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
      </button>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2.5',
        isSidebar
          ? 'border border-white/10 bg-white/[0.045] text-cream'
          : 'border border-pine-900/10 bg-white/70 text-pine-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-cream',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={clsx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
            isSidebar
              ? 'bg-pine-300/15 text-pine-200'
              : 'bg-pine-100 text-pine-700 dark:bg-pine-300/15 dark:text-pine-200',
          )}
        >
          {isDark ? (
            <Moon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sun className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {isDark ? 'Dark theme' : 'Light theme'}
          </p>
          <p
            className={clsx(
              'truncate text-[0.58rem] font-bold uppercase tracking-[0.11em]',
              isSidebar
                ? 'text-pine-200/55'
                : 'text-muted dark:text-pine-200/60',
            )}
          >
            {preference === 'system' ? `Auto · ${systemTheme}` : 'Manual'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {preference !== 'system' ? (
          <button
            type="button"
            onClick={() => setPreference('system')}
            title={`Follow browser preference (${systemTheme})`}
            aria-label="Follow browser theme preference"
            className={clsx(
              'flex h-7 w-7 items-center justify-center rounded-full transition',
              isSidebar
                ? 'text-pine-200/60 hover:bg-white/10 hover:text-cream'
                : 'text-muted hover:bg-pine-100 hover:text-pine-900 dark:text-pine-200/60 dark:hover:bg-white/10 dark:hover:text-cream',
            )}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
          onClick={toggleTheme}
          className={clsx(
            'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-200',
            isDark
              ? 'border-pine-400/40 bg-pine-500/80'
              : isSidebar
                ? 'border-white/20 bg-white/15'
                : 'border-pine-900/15 bg-pine-900/10',
          )}
        >
          <span
            className={clsx(
              'flex h-5.5 w-5.5 items-center justify-center rounded-full shadow-xs transition-transform duration-200',
              isDark
                ? 'translate-x-5 bg-pine-950 text-pine-200'
                : 'translate-x-0 bg-cream text-pine-900',
            )}
          >
            {isDark ? (
              <Moon className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Sun className="h-3 w-3" aria-hidden="true" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

const APPEARANCE_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Monitor;
}> = [
  {
    value: 'system',
    label: 'Auto',
    description: 'Matches browser',
    icon: Monitor,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Warm cream',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep pine',
    icon: Moon,
  },
];

/**
 * Full 3-option appearance picker for Settings (Auto / Light / Dark) plus a live switch.
 */
export function ThemePreferenceSelector() {
  const { preference, systemTheme, isDark, setPreference, toggleTheme } =
    useTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-pine-900/6 bg-cream/65 px-3.5 py-2.5 dark:border-white/10 dark:bg-pine-950/60">
        <div>
          <p className="text-xs font-bold text-pine-950 dark:text-cream">
            Quick switch
          </p>
          <p className="text-[0.62rem] text-muted dark:text-pine-200/65">
            Currently using {isDark ? 'dark' : 'light'} mode
            {preference === 'system' ? ` (from browser: ${systemTheme})` : ''}.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
          onClick={toggleTheme}
          className={clsx(
            'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-200',
            isDark
              ? 'border-pine-400/40 bg-pine-500/85'
              : 'border-pine-900/15 bg-pine-900/12',
          )}
        >
          <span
            className={clsx(
              'flex h-5.5 w-5.5 items-center justify-center rounded-full shadow-xs transition-transform duration-200',
              isDark
                ? 'translate-x-5 bg-pine-950 text-pine-200'
                : 'translate-x-0 bg-white text-pine-900',
            )}
          >
            {isDark ? (
              <Moon className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Sun className="h-3 w-3" aria-hidden="true" />
            )}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Theme preference">
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = preference === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreference(option.value)}
              aria-pressed={selected}
              className={clsx(
                'rounded-xl border px-2 py-2.5 text-center transition',
                selected
                  ? 'border-pine-600 bg-pine-900 text-cream dark:border-pine-400/60 dark:bg-pine-800'
                  : 'border-pine-900/10 bg-white/65 text-pine-800 hover:border-pine-300 hover:bg-pine-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-pine-100 dark:hover:border-pine-400/40 dark:hover:bg-white/[0.08]',
              )}
            >
              <Icon className="mx-auto mb-1 h-4 w-4" aria-hidden="true" />
              <span className="block text-xs font-bold">{option.label}</span>
              <span
                className={clsx(
                  'mt-0.5 block text-[0.52rem] font-bold uppercase tracking-[0.06em]',
                  selected
                    ? 'text-pine-200/75'
                    : 'text-muted/65 dark:text-pine-200/50',
                )}
              >
                {option.value === 'system'
                  ? `Browser: ${systemTheme}`
                  : option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
