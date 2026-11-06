import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Sparkles } from 'lucide-react';
import { DAILY_PROMPTS } from '@/lib/constants';
import { dayOfYear } from '@/lib/utils';
import { buttonStyles } from '@/components/ui/Button';

export function DailyQuestion() {
  const prompt = DAILY_PROMPTS[dayOfYear() % DAILY_PROMPTS.length];
  const chatHref = `/chat?prompt=${encodeURIComponent(prompt.ceb)}`;

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[1.55rem] border border-sun/20 bg-sun-soft/65 p-5 sm:p-6">
      <div className="pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-sun/10 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-[#8a6018]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Today’s honest question
        </p>
        <span className="rounded-full bg-white/50 px-2 py-1 text-[0.54rem] font-extrabold uppercase tracking-[0.1em] text-[#8a6018]/70">
          No yes-man
        </span>
      </div>

      <blockquote className="relative mt-3 flex-1">
        <p className="text-balance font-display text-[1.35rem] font-medium leading-[1.28] text-[#4e3810] sm:text-[1.5rem]">
          “{prompt.ceb}”
        </p>
        <p className="mt-2 text-[0.7rem] leading-relaxed text-[#72511a]/60">
          {prompt.en}
        </p>
      </blockquote>

      <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          to={chatHref}
          className={buttonStyles({
            variant: 'primary',
            size: 'sm',
            className: 'justify-between sm:justify-center',
          })}
        >
          Istoryaha si Higala
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          to="/toolkit?tool=thought-record"
          className={buttonStyles({
            variant: 'secondary',
            size: 'sm',
            className: 'border-[#8a6018]/15 bg-white/55 text-[#72511a] hover:bg-white',
          })}
        >
          <Brain className="h-3.5 w-3.5" aria-hidden="true" />
          Hunahuna check
        </Link>
      </div>
    </section>
  );
}
