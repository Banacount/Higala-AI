import { Link } from 'react-router-dom';
import { ArrowUpRight, Sprout } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MOOD_LEVELS } from '@/lib/constants';
import { MoodFace } from '@/components/MoodFace';
import { lastNDays, streakFromEntries } from '@/lib/utils';

export function Momentum() {
  const { moodEntries } = useApp();
  const week = lastNDays(7);
  const byDate = new Map(moodEntries.map((entry) => [entry.date, entry]));
  const streak = streakFromEntries(moodEntries);
  const checkedThisWeek = week.filter((day) => byDate.has(day)).length;

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[1.55rem] border border-pine-200/70 bg-pine-50 p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pine-200/40 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600">
            <Sprout className="h-3.5 w-3.5" aria-hidden="true" />
            Showing up
          </p>
          <h2 className="mt-1 font-display text-[1.55rem] font-semibold leading-tight text-pine-950">
            Ang pagpakita, daog na.
          </h2>
        </div>
        <Link
          to="/mood"
          aria-label="Open mood history"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-pine-900/10 bg-white/60 text-pine-700 transition hover:bg-white"
        >
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative mt-4 flex items-end gap-3">
        <span className="font-display text-5xl font-semibold leading-none text-pine-900">
          {streak}
        </span>
        <span className="pb-1 text-[0.65rem] leading-tight text-pine-900/55">
          {streak === 1 ? 'adlaw' : 'ka adlaw'}
          <br />
          nga nagpakita
        </span>
        <span className="ml-auto rounded-full bg-white/65 px-2 py-1 text-[0.56rem] font-extrabold uppercase tracking-[0.1em] text-pine-700">
          {checkedThisWeek}/7 this week
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-7 gap-1.5">
        {week.map((day) => {
          const entry = byDate.get(day);
          const weekday = new Intl.DateTimeFormat('en-PH', {
            weekday: 'narrow',
          }).format(new Date(`${day}T12:00:00`));
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-pine-900/8 bg-white/55">
                {entry ? (
                  <MoodFace level={entry.level} size={28} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-pine-900/15" />
                )}
              </div>
              <span className="text-[0.48rem] font-bold uppercase tracking-[0.04em] text-pine-900/40">
                {weekday}
              </span>
            </div>
          );
        })}
      </div>

      <p className="relative mt-4 text-[0.68rem] leading-relaxed text-pine-900/55">
        {streak > 0
          ? `Karong semanaha, ${checkedThisWeek} ka adlaw ang imong gi-check in. Bisan ang lisod nga adlaw, pagpakita gihapon.`
          : 'Start today. One honest check-in is enough—dili kinahanglan perfect.'}
      </p>

      <div className="relative mt-auto flex items-center gap-2 pt-4">
        <div className="flex -space-x-1.5">
          {week.slice(0, 4).map((day) => {
            const entry = byDate.get(day);
            return (
              <span
                key={day}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-pine-50"
                style={{
                  backgroundColor: entry
                    ? MOOD_LEVELS[entry.level].color
                    : '#ffffff',
                }}
                title={entry ? MOOD_LEVELS[entry.level].label : 'No check-in'}
              >
                {!entry ? (
                  <span className="h-1 w-1 rounded-full bg-pine-900/15" />
                ) : null}
              </span>
            );
          })}
        </div>
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.08em] text-pine-900/35">
          One honest check-in at a time
        </span>
      </div>
    </section>
  );
}
