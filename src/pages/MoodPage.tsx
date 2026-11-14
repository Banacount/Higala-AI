import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  LifeBuoy,
  LockKeyhole,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageHeader, PageShell, SafetyFooter } from '@/components/PageShell';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { MoodFace } from '@/components/MoodFace';
import { MOOD_LEVELS, MOOD_TAGS } from '@/lib/constants';
import {
  averageMood,
  formatLongDate,
  formatShortDate,
  formatWeekday,
  lastNDays,
  streakFromEntries,
  todayKey,
} from '@/lib/utils';
import type { MoodEntry } from '@/shared/types';

const LEVELS = [1, 2, 3, 4, 5] as const;

function insightFor(average: number | null): string {
  if (average === null) {
    return 'No check-ins yet this week. One honest tap is enough to start—it doesn’t have to be perfect.';
  }
  if (average < 2.5) {
    return 'Mostly low this week. That is information, not a verdict. If this has lasted two weeks or more, consider talking to a professional. If you feel unsafe, call 1553 or 911.';
  }
  if (average < 3.5) {
    return 'A mixed week. Look at which days and tags pull you down. Patterns are easier to change than moods.';
  }
  return 'Mostly steady. Protect what is working—sleep, people, and the small routines you keep showing up for.';
}

export function MoodPage() {
  const {
    todayMood,
    moodEntries,
    updateTodayMood,
    removeMoodEntry,
    openCrisis,
  } = useApp();

  const week = lastNDays(7);
  const byDate = new Map(moodEntries.map((entry) => [entry.date, entry]));
  const weekEntries = week
    .map((day) => byDate.get(day))
    .filter((entry): entry is MoodEntry => Boolean(entry));
  const weekAverage = averageMood(weekEntries);
  const streak = streakFromEntries(moodEntries);
  const checkedThisWeek = weekEntries.length;
  const history = [...moodEntries].reverse();

  const selectedTags = todayMood?.tags ?? [];
  const note = todayMood?.note ?? '';

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((item) => item !== tag)
      : [...selectedTags, tag];
    updateTodayMood({ tags: next });
  };

  const remove = (date: string) => {
    if (
      window.confirm(
        'Remove this check-in from this device? This cannot be undone.',
      )
    ) {
      removeMoodEntry(date);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Mood check-in"
        title={
          <>
            How are you actually{' '}
            <span className="italic text-pine-600 dark:text-pine-300">
              feeling?
            </span>
          </>
        }
        subtitle="Not the answer you think you should give. The honest one. Your check-ins stay on this device and help you see patterns you would otherwise miss."
        action={
          <button
            type="button"
            onClick={openCrisis}
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Need help now
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.6rem] border border-pine-900/8 bg-white/75 p-5 shadow-lift sm:p-6 dark:border-white/10 dark:bg-[#0e221b]/90">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600 dark:text-pine-300">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatLongDate()}
              </p>
              <h2 className="mt-1 font-display text-[1.6rem] font-semibold leading-tight text-pine-950 dark:text-cream">
                How are you feeling right now?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted dark:text-pine-200/70">
                Pick the face that is closest. You can change it any time.
              </p>
            </div>
            {todayMood ? (
              <Badge tone="mint">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Saved today
              </Badge>
            ) : (
              <Badge tone="cream">Not checked in yet</Badge>
            )}
          </div>

          <div className="mt-5 grid grid-cols-5 gap-1.5 sm:gap-2">
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
                  className={`group flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 transition duration-200 ${
                    selected
                      ? 'border-pine-400 bg-pine-50 shadow-sm dark:border-pine-400/70 dark:bg-pine-800/70'
                      : 'border-pine-900/8 bg-white/45 hover:-translate-y-0.5 hover:border-pine-200 hover:bg-pine-50 dark:border-white/10 dark:bg-pine-950/55 dark:hover:border-pine-500/40 dark:hover:bg-pine-900/70'
                  }`}
                >
                  <MoodFace
                    level={level}
                    size={44}
                    className="transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="text-[0.58rem] font-bold leading-tight text-pine-950/80 dark:text-cream/90">
                    {mood.label}
                  </span>
                  <span className="text-[0.46rem] font-extrabold uppercase tracking-[0.06em] text-muted/55 dark:text-pine-200/50">
                    {mood.sublabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-pine-900/6 pt-4 dark:border-white/10">
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300">
              What’s affecting it?
            </p>
            <p className="mb-2 mt-0.5 text-[0.68rem] leading-relaxed text-muted dark:text-pine-200/65">
              Optional. Tags make patterns visible later.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selected}
                    className={`rounded-full border px-2.5 py-1.5 text-[0.66rem] font-bold transition ${
                      selected
                        ? 'border-pine-600 bg-pine-900 text-cream dark:border-pine-400 dark:bg-pine-600 dark:text-white'
                        : 'border-pine-900/10 bg-white/65 text-pine-800 hover:border-pine-300 hover:bg-pine-50 dark:border-white/10 dark:bg-pine-950/60 dark:text-pine-100 dark:hover:border-pine-400/50 dark:hover:bg-pine-900/70'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-pine-900/6 pt-4 dark:border-white/10">
            <label
              htmlFor="mood-note"
              className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300"
            >
              Want to say more?
            </label>
            <p className="mb-1.5 mt-0.5 text-[0.68rem] leading-relaxed text-muted dark:text-pine-200/65">
              A sentence is enough. No one else will read this.
            </p>
            <textarea
              id="mood-note"
              value={note}
              onChange={(event) =>
                updateTodayMood({ note: event.target.value.slice(0, 1_200) })
              }
              rows={3}
              placeholder="e.g. I feel exhausted for no clear reason. I’m frustrated that I’m not making progress."
              className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
            />
            <p className="mt-1 text-right text-[0.58rem] font-semibold text-muted/50 dark:text-pine-200/45">
              {note.length}/1200
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-pine-900/6 pt-3 dark:border-white/10">
            <p className="inline-flex items-center gap-1.5 text-[0.64rem] font-semibold text-muted dark:text-pine-200/65">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              Saved only on this device
            </p>
            <Link
              to="/toolkit?tool=thought-record"
              className="inline-flex items-center gap-1 text-[0.64rem] font-extrabold uppercase tracking-[0.1em] text-pine-700 transition hover:text-pine-900 dark:text-pine-300 dark:hover:text-pine-200"
            >
              Go deeper
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <div className="space-y-3">
          <section className="relative overflow-hidden rounded-[1.6rem] bg-pine-950 p-5 text-cream shadow-soft sm:p-6 dark:border dark:border-white/10">
            <div className="pointer-events-none absolute inset-0 bg-weave opacity-60" />
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-pine-500/20 blur-3xl" />

            <div className="relative flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-200/70">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Last 7 days
              </p>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[0.56rem] font-extrabold uppercase tracking-[0.1em] text-pine-100">
                {checkedThisWeek}/7
              </span>
            </div>

            <div className="relative mt-5 flex h-24 items-end gap-1.5">
              {week.map((day) => {
                const entry = byDate.get(day);
                return (
                  <div
                    key={day}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-[0.45rem] transition-[height,background-color] duration-300"
                        style={{
                          height: entry ? `${12 + entry.level * 13}px` : '4px',
                          backgroundColor: entry
                            ? MOOD_LEVELS[entry.level].color
                            : 'rgba(255,255,255,0.12)',
                        }}
                        title={
                          entry
                            ? `${formatShortDate(day)} — ${MOOD_LEVELS[entry.level].label}`
                            : `${formatShortDate(day)} — no check-in`
                        }
                      />
                    </div>
                    <span className="text-[0.47rem] font-bold uppercase tracking-[0.06em] text-pine-200/45">
                      {formatWeekday(day)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/[0.06] p-2.5 text-center">
                <p className="font-display text-2xl font-semibold leading-none">
                  {streak}
                </p>
                <p className="mt-1 text-[0.48rem] font-extrabold uppercase tracking-[0.08em] text-pine-200/55">
                  day streak
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-2.5 text-center">
                <p className="font-display text-2xl font-semibold leading-none">
                  {checkedThisWeek}
                </p>
                <p className="mt-1 text-[0.48rem] font-extrabold uppercase tracking-[0.08em] text-pine-200/55">
                  this week
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-2.5 text-center">
                <p className="font-display text-2xl font-semibold leading-none">
                  {weekAverage === null ? '—' : weekAverage.toFixed(1)}
                </p>
                <p className="mt-1 text-[0.48rem] font-extrabold uppercase tracking-[0.08em] text-pine-200/55">
                  avg mood
                </p>
              </div>
            </div>

            <p className="relative mt-3 flex items-center gap-1.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-pine-200/45">
              <Flame className="h-3 w-3" aria-hidden="true" />
              One honest check-in at a time
            </p>
          </section>

          <div className="rounded-2xl border border-pine-200/70 bg-pine-50 p-4 dark:border-pine-500/25 dark:bg-pine-900/65">
            <p className="flex items-center gap-2 text-xs font-bold text-pine-900 dark:text-cream">
              <Sparkles className="h-3.5 w-3.5 text-pine-600 dark:text-pine-300" aria-hidden="true" />
              Honest read on this week
            </p>
            <p className="mt-1.5 text-[0.7rem] leading-relaxed text-pine-900/65 dark:text-pine-100/75">
              {insightFor(weekAverage)}
            </p>
          </div>
        </div>
      </div>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600 dark:text-pine-300">
              History
            </p>
            <h2 className="mt-1 font-display text-[1.55rem] font-semibold leading-tight text-pine-950 dark:text-cream">
              All check-ins.
            </h2>
          </div>
          <span className="rounded-full border border-pine-900/10 bg-white/60 px-3 py-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-pine-700 dark:border-white/10 dark:bg-pine-900/70 dark:text-pine-200">
            {moodEntries.length} saved
          </span>
        </div>

        {history.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-pine-300 bg-white/45 p-8 text-center dark:border-pine-500/35 dark:bg-[#0e221b]/65">
            <MoodFace level={3} size={52} className="mx-auto" />
            <p className="mt-3 font-display text-lg font-semibold text-pine-950 dark:text-cream">
              No check-ins yet.
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted dark:text-pine-200/70">
              Your first honest check-in will appear here. Pick a face above—not
              the “right” one, the true one.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((entry) => {
              const mood = MOOD_LEVELS[entry.level];
              const isToday = entry.date === todayKey();
              return (
                <article
                  key={entry.date}
                  className="flex flex-col gap-3 rounded-2xl border border-pine-900/8 bg-white/65 p-4 sm:flex-row sm:items-start dark:border-white/10 dark:bg-[#0e221b]/80"
                >
                  <div className="flex shrink-0 items-center gap-3 sm:w-40">
                    <MoodFace level={entry.level} size={40} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-pine-700 dark:text-pine-300">
                        {isToday ? 'Today' : formatShortDate(entry.date)}
                      </p>
                      <p className="text-[0.62rem] text-muted dark:text-pine-200/65">
                        {formatWeekday(entry.date)} · {mood.label}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    {entry.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-pine-100 px-2 py-0.5 text-[0.56rem] font-bold text-pine-800 dark:bg-pine-800/80 dark:text-pine-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {entry.note ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-pine-950/75 dark:text-pine-100/85">
                        {entry.note}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[0.66rem] italic text-muted/55 dark:text-pine-200/45">
                        No note. The check-in still counts.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(entry.date)}
                    aria-label={`Delete check-in for ${formatShortDate(entry.date)}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-muted/50 transition hover:bg-clay-soft hover:text-clay dark:text-pine-200/50 dark:hover:bg-clay/20 dark:hover:text-[#f0a587]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <SafetyFooter />
    </PageShell>
  );
}
