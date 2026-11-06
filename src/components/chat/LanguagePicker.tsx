import { Globe2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { LANGUAGE_OPTIONS } from '@/lib/constants';
import type { Language } from '@/shared/types';

export function LanguagePicker({ className }: { className?: string }) {
  const { profile, setLanguage } = useApp();

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <Globe2 className="hidden h-3.5 w-3.5 text-pine-600 sm:block" aria-hidden="true" />
        <label htmlFor="chat-language" className="sr-only">
          Higala reply language
        </label>
        <select
          id="chat-language"
          value={profile.language}
          onChange={(event) => setLanguage(event.target.value as Language)}
          className="h-8 rounded-full border border-pine-900/12 bg-white/70 px-2.5 text-[0.68rem] font-bold text-pine-900 outline-none transition focus:border-pine-400 sm:hidden"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="hidden items-center gap-0.5 rounded-full border border-pine-900/8 bg-pine-900/[0.045] p-1 sm:flex">
          {LANGUAGE_OPTIONS.map((option) => {
            const active = profile.language === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                aria-pressed={active}
                className={`rounded-full px-2.5 py-1 text-[0.66rem] font-bold transition-all ${
                  active
                    ? 'bg-white text-pine-900 shadow-sm'
                    : 'text-pine-900/45 hover:text-pine-800'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
