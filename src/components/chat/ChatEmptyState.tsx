import { ArrowUpRight, Brain, Flame, HeartHandshake, Wind } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

const DELAYS = ['delay-1', 'delay-2', 'delay-3', 'delay-4'];

const SUGGESTIONS = [
  {
    icon: HeartHandshake,
    text: 'Naguol ko pero di ko kahibalo ngano.',
    english: 'I’m sad and I don’t know why.',
  },
  {
    icon: Flame,
    text: 'Gisapot ko sa akong kauban. Gusto nako siya awayon.',
    english: 'I’m furious at someone. I want to fight them.',
  },
  {
    icon: Brain,
    text: 'Nerbiyos ko sa exam ug wala pa ko ka-study.',
    english: 'I’m anxious about an exam and haven’t studied.',
  },
  {
    icon: Wind,
    text: 'Gikapoy na ko sa tanan. Gusto ko og pahulay.',
    english: 'I’m tired of everything. I need rest.',
  },
];

export function ChatEmptyState({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center py-8 text-center sm:py-12">
      <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-pine-200/70 animate-breathe" />
        <div className="absolute inset-2 rounded-full border border-pine-200/45" />
        <div className="absolute inset-4 rounded-full bg-pine-100/70" />
        <BrandMark size={54} className="relative z-10 shadow-lift" />
      </div>

      <p className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-pine-600">
        Higala is here · 24/7
      </p>
      <h2 className="text-balance font-display text-[1.8rem] font-semibold leading-[1.1] text-pine-950 sm:text-4xl">
        Unsa ang tinuod nimong gibati karon?
      </h2>
      <p className="mt-2 max-w-md text-balance text-sm leading-relaxed text-muted">
        What are you actually feeling right now? I won’t say it’s okay if it
        isn’t. We’ll start where you are.
      </p>

      <div className="mt-6 grid w-full max-w-xl gap-2 text-left sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={suggestion.text}
            type="button"
            onClick={() => onPick(suggestion.text)}
            className={`group flex animate-fade-up items-start gap-2.5 rounded-2xl border border-pine-900/8 bg-white/65 p-3 text-left transition hover:-translate-y-0.5 hover:border-pine-300 hover:bg-white hover:shadow-lift ${DELAYS[index] ?? ''}`}
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-100 text-pine-700">
              <suggestion.icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.78rem] font-semibold leading-snug text-pine-950">
                {suggestion.text}
              </span>
              <span className="mt-0.5 block text-[0.64rem] leading-snug text-muted/70">
                {suggestion.english}
              </span>
            </span>
            <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-pine-400 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
          </button>
        ))}
      </div>

      <p className="mt-5 max-w-sm text-[0.68rem] leading-relaxed text-muted/60">
        Pwede ka mag-Bisaya, Tagalog, o English. Bisan mag-code-switch, okay ra.
        No judgement—but also no flattery.
      </p>
    </div>
  );
}
