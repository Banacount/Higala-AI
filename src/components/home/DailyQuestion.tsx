import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Sparkles } from 'lucide-react';
import { DAILY_PROMPTS } from '@/lib/constants';
import { dayOfYear } from '@/lib/utils';
import { buttonStyles } from '@/components/ui/Button';

export function DailyQuestion() {
  const prompt = DAILY_PROMPTS[dayOfYear() % DAILY_PROMPTS.length];
  const chatHref = `/chat?prompt=${encodeURIComponent(prompt.ceb)}`;

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[1.55rem] border border-sun/15 bg-sun-soft/45 p-5 sm:p-6">
      <div className="pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-sun/10 blur-2xl" />

      <p className="relative flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-[#8a6018]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Today’s honest question
      </p>

      <blockquote className="relative mt-3 flex-1">
        <p className="text-balance font-display text-[1.35rem] font-medium leading-[1.28] text-[#4e3810] sm:text-[1.45rem]">
          “{prompt.ceb}”
        </p>
        <p className="mt-2 text-[0.7rem] leading-relaxed text-[#72511a]/60">
          {prompt.en}
        </p>
      </blockquote>

      <div className="relative mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          to={chatHref}
          className={buttonStyles({
            size: 'sm',
            className: 'justify-between sm:justify-center',
          })}
        >
          Istoryaha si Higala
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          to="/toolkit?tool=thought-record"
          className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[#72511a]/80 transition hover:bg-white/60 hover:text-[#72511a]"
        >
          <Brain className="h-3.5 w-3.5" aria-hidden="true" />
          Hunahuna check
        </Link>
      </div>
    </section>
  );
}
