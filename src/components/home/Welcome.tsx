import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Globe2,
  LockKeyhole,
  MessageCircle,
  Smile,
  Wind,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { buttonStyles } from '@/components/ui/Button';

const STEPS = [
  {
    icon: Smile,
    title: 'Check in',
    body: 'One tap to name how you feel today.',
    to: '/mood',
  },
  {
    icon: MessageCircle,
    title: 'Talk it through',
    body: 'Tell Higala what is really going on.',
    to: '/chat',
  },
  {
    icon: Wind,
    title: 'Try a small tool',
    body: 'A short reset when your head is loud.',
    to: '/toolkit',
  },
];

export function Welcome() {
  const { profile } = useApp();
  const name = profile.name.trim();

  return (
    <section className="relative overflow-hidden rounded-[1.8rem] border border-pine-900/8 bg-white/70 shadow-soft">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-pine-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-sun/10 blur-3xl" />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:p-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pine-900/8 bg-white/70 px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-pine-700">
            <span className="h-1.5 w-1.5 rounded-full bg-pine-500" />
            24/7 nga higala
          </span>

          <h1 className="mt-4 text-balance font-display text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-pine-950 sm:text-[2.8rem] lg:text-[3rem]">
            Kumusta ka,{' '}
            <span className="italic text-pine-700">{name || 'bai'}</span>?
          </h1>

          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted sm:text-[0.92rem]">
            Higala listens properly, then tells you the truth. Honest care, in
            the language your heart speaks.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to="/chat"
              className={buttonStyles({
                size: 'md',
                className: 'justify-between sm:justify-center',
              })}
            >
              Sugdi ang istorya
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/toolkit?tool=breathing"
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              <Wind className="h-4 w-4" aria-hidden="true" />
              2-minutong ginhawa
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted/75">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-pine-500" aria-hidden="true" />
              Private on your device
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-pine-500" aria-hidden="true" />
              Bisaya · Tagalog · English
            </span>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-pine-900/8 bg-pine-50/70 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-pine-600">
              How it works
            </p>
            <span className="text-[0.56rem] font-bold uppercase tracking-[0.12em] text-pine-600/55">
              3 simple steps
            </span>
          </div>

          <ol className="mt-3 space-y-1">
            {STEPS.map((step) => (
              <li key={step.title}>
                <Link
                  to={step.to}
                  className="group flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-white/75"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-pine-700 ring-1 ring-pine-900/8">
                    <step.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.78rem] font-bold text-pine-950">
                      {step.title}
                    </span>
                    <span className="block text-[0.66rem] leading-snug text-muted">
                      {step.body}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-pine-400 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
