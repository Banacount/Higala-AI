import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MOOD_LEVELS } from '@/lib/constants';
import { MoodFace } from '@/components/MoodFace';
import { lastNDays, streakFromEntries, todayKey } from '@/lib/utils';

const LEVELS = [1, 2, 3, 4, 5] as const;
const NARROW_WEEKDAY = new Intl.DateTimeFormat('en-PH', {
  weekday: 'narrow',
});

export function DailyCheckIn() {
  const { todayMood, updateTodayMood, moodEntries } = useApp();
  const today = todayKey();
  const savedToday = todayMood?.date === today;
  const week = lastNDays(7);
  const byDate = new Map(moodEntries.map((entry) => [entry.date, entry]));
  const streak = streakFromEntries(moodEntries);
  const checkedThisWeek = week.filter((day) => byDate.has(day)).length;

  return (
    <section className="rounded-[1.55rem] border border-pine-900/8 bg-white/75 p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-pine-600">
                Daily check-in
              </p>
              <h2 className="mt-1 font-display text-[1.5rem] font-semibold leading-tight text-pine-950">
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
                  aria-label={`${mood.label} — ${mood.sublabel}`}
                  className={`group flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 transition duration-200 ${
                    selected
                      ? 'border-pine-400 bg-pine-50 shadow-sm'
                      : 'border-transparent bg-pine-900/[0.025] hover:-translate-y-0.5 hover:border-pine-200 hover:bg-pine-50'
                  }`}
                >
                  <MoodFace
                    level={level}
                    size={38}
                    className="transition-transform duration-200 group-hover:scale-105"
                  />
                  <span
                    className={`text-[0.58rem] font-bold leading-tight ${
                      selected ? 'text-pine-900' : 'text-pine-950/70'
                    }`}
                  >
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-pine-900/6 pt-3">
            {savedToday ? (
              <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold text-pine-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Narehistro na. Salamat sa pagkamatinud-anon.
              </span>
            ) : (
              <span className="text-[0.68rem] font-medium text-muted/70">
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
        </div>

        <div className="shrink-0 lg:w-[17rem] lg:border-l lg:border-pine-900/8 lg:pl-8">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-pine-600">
            This week
          </p>

          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-4xl font-semibold leading-none text-pine-900">
              {streak}
            </span>
            <span className="pb-0.5 text-[0.62rem] leading-tight text-pine-900/55">
              ka adlaw
              <br />
              nga nagpakita
            </span>
            <span className="ml-auto rounded-full bg-pine-100 px-2 py-1 text-[0.55rem] font-extrabold uppercase tracking-[0.08em] text-pine-700">
              {checkedThisWeek}/7
            </span>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {week.map((day) => {
              const entry = byDate.get(day);
              const weekday = NARROW_WEEKDAY.format(
                new Date(`${day}T12:00:00`),
              );
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border bg-white/60 ${
                      day === today
                        ? 'border-pine-300'
                        : 'border-pine-900/8'
                    }`}
                  >
                    {entry ? (
                      <MoodFace level={entry.level} size={20} />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-pine-900/15" />
                    )}
                  </div>
                  <span className="text-[0.48rem] font-bold uppercase tracking-[0.04em] text-pine-900/40">
                    {weekday}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[0.68rem] leading-relaxed text-muted">
            {streak > 0
              ? `Karong semanaha, ${checkedThisWeek} ka adlaw ang imong gi-check in.`
              : 'Start today. One honest check-in is enough.'}
          </p>
        </div>
      </div>
    </section>
  );
}
