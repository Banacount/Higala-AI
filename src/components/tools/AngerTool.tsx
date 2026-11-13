import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const SIGNALS = [
  'head feels hot',
  'racing heart',
  'loud voice',
  'wanting to yell',
  'wanting to fight back',
  'shaking',
  'can’t think straight',
];

const NEXT_STEPS = [
  'Step outside for 5 minutes',
  'Drink a glass of water',
  'Lie down and rest',
  'Call a friend',
  'Write down what I feel',
];

const SCRIPT =
  'I need a few minutes. I’ll come back when I’ve cooled down.';

function heatLabel(value: number): { label: string; color: string } {
  if (value <= 3) return { label: 'Still calm', color: '#239C72' };
  if (value <= 6) return { label: 'Heating up', color: '#C98F2E' };
  if (value <= 8) return { label: 'Running hot', color: '#C0703A' };
  return { label: 'About to boil', color: '#B85C38' };
}

export function AngerTool() {
  const [heat, setHeat] = useState(5);
  const [signals, setSignals] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(
      () => setSeconds((current) => current - 1),
      1_000,
    );
    return () => window.clearTimeout(timer);
  }, [running, seconds]);

  const startPause = () => {
    if (seconds <= 0) {
      setSeconds(90);
      setRunning(true);
      return;
    }
    setRunning((current) => !current);
  };

  const resetTimer = () => {
    setRunning(false);
    setSeconds(90);
  };

  const toggleSignal = (signal: string) => {
    setSignals((current) =>
      current.includes(signal)
        ? current.filter((item) => item !== signal)
        : [...current, signal],
    );
  };

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(SCRIPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access may be blocked.
    }
  };

  const mood = heatLabel(heat);
  const progress = ((90 - seconds) / 90) * 100;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-clay/15 bg-clay-soft/70 px-3.5 py-2.5">
        <p className="text-xs leading-relaxed text-[#7a4128]">
          Anger is a wave. The first surge usually peaks and falls. You do not
          have to make a permanent decision at the highest point.
        </p>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700">
              How heated are you right now?
            </p>
            <p className="mt-1 font-display text-2xl font-semibold" style={{ color: mood.color }}>
              {mood.label}
            </p>
          </div>
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-white"
            style={{ backgroundColor: mood.color }}
          >
            {heat}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={heat}
          onChange={(event) => setHeat(Number(event.target.value))}
          aria-label="Anger heat level, 1 to 10"
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-pine-300 via-sun to-clay"
          style={{ accentColor: mood.color }}
        />
        <div className="mt-1 flex justify-between text-[0.55rem] font-bold uppercase tracking-[0.08em] text-muted/50">
          <span>1 · calm</span>
          <span>10 · about to boil</span>
        </div>
      </div>

      <div>
        <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700">
          What’s happening in your body?
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SIGNALS.map((signal) => {
            const selected = signals.includes(signal);
            return (
              <button
                key={signal}
                type="button"
                onClick={() => toggleSignal(signal)}
                aria-pressed={selected}
                className={`rounded-full border px-2.5 py-1.5 text-[0.66rem] font-bold transition ${
                  selected
                    ? 'border-clay bg-clay text-white'
                    : 'border-pine-900/10 bg-white/65 text-pine-800 hover:border-clay/30'
                }`}
              >
                {signal}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-pine-900/8 bg-white/65 p-4">
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#B85C38 ${progress}%, #F0E4DC ${progress}% 100%)`,
            }}
          >
            <div className="flex h-[4.8rem] w-[4.8rem] flex-col items-center justify-center rounded-full bg-cream">
              <span className="font-display text-2xl font-semibold leading-none text-pine-950">
                {seconds}
              </span>
              <span className="text-[0.5rem] font-extrabold uppercase tracking-[0.08em] text-muted/60">
                seconds
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-clay">
              90-second pause
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {seconds === 0
                ? 'The first wave has passed. Choose your next move—not the loudest one.'
                : 'Breathe out slowly. Do not send the message yet. Do not make the call yet.'}
            </p>
            <div className="mt-2 flex gap-1.5">
              <Button onClick={startPause} size="sm" variant="danger">
                {running ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {running ? 'Pause' : seconds === 0 ? 'Again' : 'Start'}
              </Button>
              <Button onClick={resetTimer} size="sm" variant="ghost">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-pine-900/8 bg-pine-50 p-4">
        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-pine-700">
          Say it without lighting the fire
        </p>
        <p className="mt-1.5 font-display text-lg leading-snug text-pine-950">
          “{SCRIPT}”
        </p>
        <button
          type="button"
          onClick={copyScript}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1.5 text-[0.62rem] font-bold text-pine-800 transition hover:bg-white"
        >
          {copied ? (
            <Check className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3" aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy script'}
        </button>
      </div>

      <div>
        <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700">
          What will you do next?
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {NEXT_STEPS.map((step) => {
            const selected = nextStep === step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => setNextStep(selected ? null : step)}
                aria-pressed={selected}
                className={`rounded-full border px-2.5 py-1.5 text-[0.66rem] font-bold transition ${
                  selected
                    ? 'border-pine-600 bg-pine-900 text-cream'
                    : 'border-pine-900/10 bg-white/65 text-pine-800 hover:border-pine-300'
                }`}
              >
                {step}
              </button>
            );
          })}
        </div>
        {nextStep ? (
          <p className="mt-2 text-[0.68rem] font-semibold text-pine-700">
            Okay. {nextStep}. One step, not your whole life.
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-clay/15 bg-clay-soft/60 px-3 py-2.5">
        <ShieldAlert
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay"
          aria-hidden="true"
        />
        <p className="text-[0.65rem] leading-relaxed text-[#7a4128]">
          If you might hurt yourself or someone else, step away and call{' '}
          <a className="font-bold underline" href="tel:911">
            911
          </a>{' '}
          or{' '}
          <a className="font-bold underline" href="tel:1553">
            1553
          </a>
          . Anger is not an excuse for violence.
        </p>
      </div>
    </div>
  );
}
