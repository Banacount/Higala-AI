import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Globe2,
  Leaf,
  LockKeyhole,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { buttonStyles } from '@/components/ui/Button';
import { BrandMark } from '@/components/BrandMark';

const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Dili yes-man' },
  { icon: Globe2, label: 'Bisaya · Tagalog · English' },
  { icon: LockKeyhole, label: 'Stays on your device' },
];

export function Hero() {
  const { profile } = useApp();
  const name = profile.name.trim();

  return (
    <section className="grain relative overflow-hidden rounded-[1.8rem] bg-pine-900 text-cream shadow-soft sm:rounded-[2.2rem]">
      <div className="pointer-events-none absolute inset-0 bg-weave opacity-70" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-pine-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-pine-500/15 blur-3xl" />
      <div className="pointer-events-none absolute right-[42%] top-10 h-24 w-24 rounded-full bg-sun/10 blur-2xl" />

      <div className="relative z-10 grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-pine-100/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine-300 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pine-300" />
              </span>
              24/7 nga higala
            </span>
            <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-pine-200/60">
              Gemini 3
            </span>
          </div>

          <h1 className="mt-4 text-balance font-display text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-[3.65rem]">
            Kumusta ka,{' '}
            <span className="italic text-pine-300">{name || 'bai'}</span>?
          </h1>

          <p className="mt-4 max-w-lg text-pretty text-sm leading-relaxed text-pine-100/72 sm:text-[0.95rem]">
            Higala is the friend who listens properly—then tells you the truth.
            No toxic positivity. No yes-man. Just honest care, in the language
            your heart actually speaks.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link
              to="/chat"
              className={buttonStyles({
                variant: 'light',
                size: 'lg',
                className: 'justify-between sm:justify-center',
              })}
            >
              Sugdi ang istorya
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/toolkit?tool=breathing"
              className={buttonStyles({
                variant: 'lightOutline',
                size: 'lg',
              })}
            >
              <Wind className="h-4 w-4" aria-hidden="true" />
              2-minutong ginhawa
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2">
            {TRUST_POINTS.map((point) => (
              <span
                key={point.label}
                className="inline-flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.09em] text-pine-100/55"
              >
                <point.icon className="h-3.5 w-3.5 text-pine-300" aria-hidden="true" />
                {point.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative hidden items-center justify-center lg:flex">
          <div className="absolute -right-2 top-0 rotate-3 rounded-full border border-white/15 bg-pine-800/80 px-3 py-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.15em] text-pine-200 shadow-lift backdrop-blur">
            No-yes-man check
          </div>

          <div className="w-full max-w-[350px] -rotate-2 rounded-[1.6rem] border border-white/15 bg-white/[0.08] p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] backdrop-blur-md">
            <div className="rounded-[1.25rem] bg-cream p-3.5 text-ink">
              <div className="mb-3 flex items-center gap-2">
                <BrandMark size={28} />
                <div className="flex-1">
                  <p className="text-[0.7rem] font-extrabold leading-none">Higala</p>
                  <p className="mt-0.5 text-[0.52rem] font-bold uppercase tracking-[0.1em] text-pine-500">
                    Naminaw og tinuod
                  </p>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-pine-400" />
              </div>

              <div className="ml-5 rounded-2xl rounded-br-md bg-pine-900 px-3 py-2 text-[0.68rem] leading-relaxed text-cream">
                Gisapot ko sa akong kauban. Gusto nako siya awayon.
              </div>

              <div className="mt-2 rounded-2xl rounded-bl-md border border-pine-900/8 bg-white px-3 py-2.5 text-[0.68rem] leading-relaxed text-pine-950 shadow-sm">
                Kasabot ko nga nasakitan ka. Pero ang pag-away dili makahatag
                nimog respeto. Unsa ang tinuod nimong gusto mahitabo?
              </div>

              <div className="mt-2 rounded-r-lg border-l-2 border-sun bg-sun-soft/80 px-2.5 py-2">
                <p className="text-[0.48rem] font-extrabold uppercase tracking-[0.15em] text-[#8a6018]">
                  The honest part
                </p>
                <p className="mt-0.5 text-[0.62rem] leading-relaxed text-[#72511a]">
                  Ang kasuko senyales nga naay importante nga gipangita—dili
                  maayo nga driver.
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-pine-100 px-2 py-1 text-[0.52rem] font-extrabold uppercase tracking-[0.09em] text-pine-700">
                  <Wind className="h-2.5 w-2.5" aria-hidden="true" />
                  Try anger pause · 2 min
                </span>
                <span className="text-[0.5rem] font-bold uppercase tracking-[0.1em] text-muted/50">
                  now
                </span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-pine-950/85 px-3 py-1.5 text-[0.56rem] font-extrabold uppercase tracking-[0.12em] text-pine-200 shadow-lift backdrop-blur animate-float-delayed">
            <Leaf className="h-3 w-3 text-pine-300" aria-hidden="true" />
            Higalaay, dili pag-uyon
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-1.5 border-t border-white/8 px-5 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.13em] text-pine-200/38 sm:px-8 lg:px-10">
        <Check className="h-3 w-3" aria-hidden="true" />
        Peer support, not a therapist · Crisis lines built in
      </div>
    </section>
  );
}
