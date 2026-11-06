import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MOOD_LEVELS } from '@/lib/constants';
import { MoodFace } from '@/components/MoodFace';
import { todayKey } from '@/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;

export function QuickMood() {
  const { todayMood, updateTodayMood } = useApp();
  const savedToday = todayMood?.date === todayKey();

  return (
    <section className="flex h-full flex-col rounded-[1.55rem] border border-pine-900/8 bg-white/72 p-5 shadow-lift backdrop-blur-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600">
            Check in
          </p>
          <h2 className="mt-1 font-display text-[1.55rem] font-semibold leading-tight text-pine-950">
            Unsa imong gibati?
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            No wrong answer. Just the honest one.
          </p>
        </div>
        <Link
          to="/mood"
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-pine-700 transition hover:bg-pine-50"
        >
          History
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
        {LEVELS.map((level) => {
          const mood = MOOD_LEVELS[level];
          const selected = todayMood?.level === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => updateTodayMood({ level })}
              aria-pressed={selected}
              className={`group flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 transition-all duration-200 ${
                selected
                  ? 'border-pine-400 bg-pine-50 shadow-sm'
                  : 'border-transparent bg-pine-900/[0.025] hover:-translate-y-0.5 hover:border-pine-200 hover:bg-pine-50'
              }`}
            >
              <MoodFace
                level={level}
                size={40}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="text-[0.56rem] font-bold leading-tight text-pine-950/75">
                {mood.label}
              </span>
              <span className="text-[0.45rem] font-extrabold uppercase tracking-[0.06em] text-muted/55">
                {mood.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-pine-900/6 pt-3">
        {savedToday ? (
          <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-semibold text-pine-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Narehistro na. Salamat sa pagkamatinud-anon.
          </span>
        ) : (
          <span className="text-[0.66rem] font-medium text-muted/65">
            One tap is enough to start.
          </span>
        )}
        <Link
          to="/mood"
          className="text-[0.64rem] font-extrabold uppercase tracking-[0.1em] text-pine-600 underline-offset-2 hover:underline"
        >
          {savedToday ? 'Add a note' : 'Open check-in'}
        </Link>
      </div>
    </section>
  );
}
