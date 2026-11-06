import { ArrowUpRight, Ear, ShieldCheck, UserRound } from 'lucide-react';
import { buttonStyles } from '@/components/ui/Button';

const RULES = [
  { icon: Ear, text: 'Feelings are real. The story around them can still be wrong.' },
  {
    icon: ShieldCheck,
    text: 'We name the pattern—never attack the person.',
  },
  {
    icon: UserRound,
    text: 'You leave with a next step, not a slogan.',
  },
];

export function CandorCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="grain relative flex h-full flex-col overflow-hidden rounded-[1.55rem] bg-pine-900 p-5 text-cream sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-weave opacity-60" />
      <div className="pointer-events-none absolute -bottom-16 -right-12 h-48 w-48 rounded-full bg-pine-400/15 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[0.56rem] font-extrabold uppercase tracking-[0.15em] text-pine-200/75">
          The Higala way
        </span>
        <span className="text-[0.56rem] font-extrabold uppercase tracking-[0.15em] text-pine-200/35">
          Higalaay
        </span>
      </div>

      <p className="relative mt-4 font-display text-[1.4rem] font-medium leading-[1.2] text-cream sm:text-[1.55rem]">
        “Dili mi moingon nga okay ra kung dili.”
      </p>
      <p className="relative mt-1.5 text-[0.66rem] leading-relaxed text-pine-200/55">
        We won’t say it’s okay when it isn’t. That is not kindness—it is
        avoidance.
      </p>

      <ul className="relative mt-4 space-y-2.5">
        {RULES.map((rule) => (
          <li key={rule.text} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-pine-300">
              <rule.icon className="h-3 w-3" aria-hidden="true" />
            </span>
            <span className="text-[0.68rem] leading-relaxed text-pine-100/65">
              {rule.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOpen}
        className={buttonStyles({
          variant: 'lightOutline',
          size: 'sm',
          className: 'relative mt-auto w-full justify-between',
        })}
      >
        Why no yes-man?
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </section>
  );
}
