import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Wind } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const PHASES = [
  {
    label: 'Breathe in',
    english: 'Inhale · 4s',
    seconds: 4,
    scale: 1.12,
    color: 'from-pine-200 to-pine-400 dark:from-pine-700 dark:to-pine-500',
  },
  {
    label: 'Hold',
    english: 'Hold · 4s',
    seconds: 4,
    scale: 1.12,
    color: 'from-pine-300 to-pine-500 dark:from-pine-600 dark:to-pine-400',
  },
  {
    label: 'Breathe out',
    english: 'Exhale · 4s',
    seconds: 4,
    scale: 0.84,
    color: 'from-pine-100 to-pine-300 dark:from-pine-800 dark:to-pine-600',
  },
  {
    label: 'Rest',
    english: 'Hold · 4s',
    seconds: 4,
    scale: 0.84,
    color: 'from-pine-100 to-pine-200 dark:from-pine-900 dark:to-pine-700',
  },
] as const;

export function BreathingTool() {
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState({ phase: 0, remaining: 4, cycles: 0 });
  const [scale, setScale] = useState(0.84);
  const [finished, setFinished] = useState(false);
  const phase = PHASES[session.phase];

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (current.remaining > 1) {
          return { ...current, remaining: current.remaining - 1 };
        }
        const nextPhase = (current.phase + 1) % PHASES.length;
        const cycles =
          nextPhase === 0 ? current.cycles + 1 : current.cycles;
        return {
          phase: nextPhase,
          remaining: PHASES[nextPhase].seconds,
          cycles,
        };
      });
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    setScale(PHASES[session.phase].scale);
  }, [running, session.phase]);

  useEffect(() => {
    if (session.cycles >= 4) {
      setRunning(false);
      setFinished(true);
    }
  }, [session.cycles]);

  const toggle = () => {
    if (finished) {
      setFinished(false);
      setSession({ phase: 0, remaining: 4, cycles: 0 });
      setScale(0.84);
      window.setTimeout(() => setRunning(true), 30);
      return;
    }
    setRunning((current) => !current);
  };

  const reset = () => {
    setRunning(false);
    setFinished(false);
    setSession({ phase: 0, remaining: 4, cycles: 0 });
    setScale(0.84);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl border border-pine-900/8 bg-pine-50 px-3.5 py-2.5 text-xs leading-relaxed text-pine-900/70 dark:border-pine-500/25 dark:bg-pine-900/65 dark:text-pine-100/80">
        <Wind className="h-4 w-4 shrink-0 text-pine-600 dark:text-pine-300" aria-hidden="true" />
        Follow the circle, not the clock. If you feel dizzy, stop and breathe
        normally.
      </div>

      <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
        <div className="absolute inset-2 rounded-full border border-pine-200/70 dark:border-pine-500/30" />
        <div className="absolute inset-7 rounded-full border border-pine-200/40 dark:border-pine-500/20" />
        <div className="animate-breathe absolute inset-8 rounded-full bg-pine-100/80 blur-2xl dark:bg-pine-500/20" />
        <div
          className={`breath-ring absolute inset-7 rounded-full bg-gradient-to-br ${phase.color} shadow-[0_25px_70px_-30px_rgba(11,59,46,.5)]`}
          style={{
            transform: `scale(${scale})`,
            transitionDuration: running ? `${phase.seconds}s` : '0.6s',
          }}
        />
        <div className="relative z-10 text-center">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-800/60 dark:text-pine-100/80">
            {phase.english}
          </p>
          <p className="mt-1 font-display text-[3.2rem] font-semibold leading-none text-pine-950 dark:text-cream">
            {finished ? '✓' : session.remaining}
          </p>
          <p className="mt-1 text-sm font-semibold text-pine-900/70 dark:text-pine-50/90">
            {finished ? 'All done' : phase.label}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-[width,background-color] ${
              session.cycles > index
                ? 'w-6 bg-pine-600 dark:bg-pine-400'
                : 'w-3 bg-pine-900/12 dark:bg-white/15'
            }`}
          />
        ))}
        <span className="ml-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-pine-900/40 dark:text-pine-200/60">
          {session.cycles}/4 cycles
        </span>
      </div>

      {finished ? (
        <div className="rounded-2xl border border-pine-200 bg-pine-50 p-4 text-center dark:border-pine-500/30 dark:bg-pine-900/70">
          <p className="font-display text-lg font-semibold text-pine-950 dark:text-cream">
            You’re back in your body.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted dark:text-pine-200/75">
            Four rounds done. Notice one thing that feels different—even
            slightly.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={toggle}
          size="md"
          className="min-w-[140px]"
        >
          {finished ? (
            <>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Another round
            </>
          ) : running ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              Start breathing
            </>
          )}
        </Button>
        <Button variant="secondary" size="md" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </Button>
      </div>
    </div>
  );
}
