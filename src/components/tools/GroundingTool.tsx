import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { GROUNDING_STEPS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';

function emptyEntries(): string[][] {
  return GROUNDING_STEPS.map((step) => Array<string>(step.count).fill(''));
}

export function GroundingTool() {
  const [stepIndex, setStepIndex] = useState(0);
  const [entries, setEntries] = useState<string[][]>(emptyEntries);
  const [done, setDone] = useState(false);
  const step = GROUNDING_STEPS[stepIndex];
  const complete = entries[stepIndex].every((value) => value.trim());

  const setEntry = (valueIndex: number, value: string) => {
    setEntries((current) =>
      current.map((row, rowIndex) =>
        rowIndex === stepIndex
          ? row.map((item, itemIndex) => (itemIndex === valueIndex ? value : item))
          : row,
      ),
    );
  };

  const next = () => {
    if (stepIndex < GROUNDING_STEPS.length - 1) {
      setStepIndex((current) => current + 1);
    } else {
      setDone(true);
    }
  };

  const reset = () => {
    setEntries(emptyEntries());
    setStepIndex(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] border border-pine-200 bg-pine-50 p-5 text-center sm:p-7 dark:border-pine-500/30 dark:bg-pine-900/65">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pine-900 text-cream dark:bg-pine-500 dark:text-pine-950">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold text-pine-950 dark:text-cream">
            You’re back in the present.
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted dark:text-pine-200/75">
            You came back through your senses. Notice your feet on the floor and
            one slow breath before you decide what’s next.
          </p>
        </div>

        <div className="space-y-2.5">
          {GROUNDING_STEPS.map((item, index) => (
            <div
              key={item.title}
              className="rounded-2xl border border-pine-900/8 bg-white/70 p-3.5 dark:border-white/10 dark:bg-pine-950/60"
            >
              <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-pine-600 dark:text-pine-300">
                {item.count} · {item.english}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-pine-950/75 dark:text-pine-100/85">
                {entries[index].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          ))}
        </div>

        <Button onClick={reset} className="w-full">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Start again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {GROUNDING_STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 rounded-full transition-[width,background-color] ${
                index === stepIndex
                  ? 'w-7 bg-pine-600 dark:bg-pine-400'
                  : index < stepIndex
                    ? 'w-3 bg-pine-300 dark:bg-pine-600'
                    : 'w-3 bg-pine-900/12 dark:bg-white/15'
              }`}
            />
          ))}
        </div>
        <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-pine-600 dark:text-pine-300">
          Step {stepIndex + 1} of {GROUNDING_STEPS.length}
        </span>
      </div>

      <div>
        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-pine-600 dark:text-pine-300">
          {step.english}
        </p>
        <h3 className="mt-1 font-display text-2xl font-semibold leading-tight text-pine-950 dark:text-cream">
          {step.title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted dark:text-pine-200/70">
          {step.hint}
        </p>
      </div>

      <div className="space-y-2">
        {step.count > 1
          ? Array.from({ length: step.count }, (_, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-100 text-[0.62rem] font-extrabold text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
                  {index + 1}
                </span>
                <input
                  value={entries[stepIndex][index]}
                  onChange={(event) => setEntry(index, event.target.value)}
                  placeholder={step.placeholder}
                  aria-label={`${step.english} ${index + 1}`}
                  className="h-10 w-full rounded-xl border border-pine-900/10 bg-white/70 px-3 text-sm text-ink outline-none transition placeholder:text-muted/45 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
                />
              </div>
            ))
          : (
            <input
              value={entries[stepIndex][0]}
              onChange={(event) => setEntry(0, event.target.value)}
              placeholder={step.placeholder}
              aria-label={step.english}
              className="h-11 w-full rounded-xl border border-pine-900/10 bg-white/70 px-3 text-sm text-ink outline-none transition placeholder:text-muted/45 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
            />
          )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-pine-900/8 pt-4 dark:border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          disabled={stepIndex === 0}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={next}
            className="text-[0.62rem] font-bold uppercase tracking-[0.08em] text-muted/60 hover:text-pine-700 dark:text-pine-200/60 dark:hover:text-pine-200"
          >
            Skip
          </button>
          <Button onClick={next} size="sm" disabled={!complete}>
            {stepIndex === GROUNDING_STEPS.length - 1 ? 'Finish' : 'Next'}
            {stepIndex === GROUNDING_STEPS.length - 1 ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
