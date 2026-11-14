import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  ExternalLink,
  HeartHandshake,
  LifeBuoy,
  Phone,
  ShieldCheck,
  Siren,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageHeader, PageShell, SafetyFooter } from '@/components/PageShell';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import {
  CRISIS_LINES,
  CRISIS_NOTE,
  RESOURCE_LINKS,
  SUPPORT_TIPS,
} from '@/lib/constants';

const PROFESSIONAL_SIGNS = [
  'You have felt low, anxious, or numb for most of the day, nearly every day, for two weeks or more.',
  'Sleep, appetite, school, or work has changed in a way that is hurting your daily life.',
  'You are leaning on alcohol, substances, or risky behaviour to get through the day.',
  'You have thoughts of harming yourself or someone else. This is urgent—not a last resort.',
  'Someone you care about is in danger, and you do not know how to keep them safe alone.',
];

const CDO_STEPS = [
  'Start at your barangay health center or the Cagayan de Oro City Health Office. Ask for the mental health focal person or a referral.',
  'For a private option, ask for a psychiatrist or clinical psychologist. A first consult is a conversation, not an instant diagnosis.',
  'Ask about fees, PhilHealth, and sliding-scale options. Public services and university training clinics can be more affordable.',
  'If you are in immediate danger, go to the nearest emergency room or call 911. Do not wait for an appointment.',
];

export function ResourcesPage() {
  const { openCrisis } = useApp();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Get help"
        title={
          <>
            Real help,{' '}
            <span className="italic text-pine-600 dark:text-pine-300">
              not just advice.
            </span>
          </>
        }
        subtitle="If you are in danger, call now. If you are not sure, read on. Asking for help early is not weakness—it is strategy."
        action={
          <button
            type="button"
            onClick={openCrisis}
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Open help now
          </button>
        }
      />

      <section className="grain relative overflow-hidden rounded-[1.7rem] bg-pine-950 p-5 text-cream shadow-soft sm:p-7 dark:border dark:border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-weave opacity-60" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-pine-500/20 blur-3xl" />
        <div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-pine-100/80">
              <Siren className="h-3 w-3" aria-hidden="true" />
              Immediate danger
            </span>
            <h2 className="mt-3 text-balance font-display text-[1.8rem] font-semibold leading-tight sm:text-3xl">
              Call 911. Stay on the line.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-pine-100/70">
              If you might act on a thought of harming yourself, that is enough
              reason to call. You do not need the perfect words, and you do not
              need to be “sure enough.”
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[190px]">
            <a
              href="tel:911"
              className={buttonStyles({
                variant: 'light',
                size: 'md',
                className: 'justify-between',
              })}
            >
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call 911
              </span>
              <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-clay">
                now
              </span>
            </a>
            <a
              href="tel:1553"
              className={buttonStyles({
                variant: 'lightOutline',
                size: 'md',
                className: 'justify-between',
              })}
            >
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" aria-hidden="true" />
                NCMH 1553
              </span>
              <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-pine-300">
                24/7
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600 dark:text-pine-300">
              Philippines crisis lines
            </p>
            <h2 className="mt-1 font-display text-[1.55rem] font-semibold leading-tight text-pine-950 dark:text-cream">
              You can speak up. Someone will listen.
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-[0.11em] text-pine-600 dark:text-pine-300">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            24/7 where noted
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {CRISIS_LINES.map((line) => (
            <a
              key={line.name}
              href={`tel:${line.tel}`}
              className={`group flex items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                line.highlight
                  ? 'border-pine-950 bg-pine-900 text-cream hover:bg-pine-800 sm:col-span-2 dark:border-pine-500/35 dark:bg-pine-900/90 dark:hover:bg-pine-800'
                  : 'border-pine-900/10 bg-white/70 text-pine-950 hover:border-pine-300 hover:bg-white dark:border-white/10 dark:bg-[#0e221b]/85 dark:text-cream dark:hover:border-pine-500/40 dark:hover:bg-[#132b22]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    line.highlight
                      ? 'bg-white/10 text-pine-200'
                      : 'bg-pine-100 text-pine-700 dark:bg-pine-800/80 dark:text-pine-200'
                  }`}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{line.name}</p>
                  <p
                    className={`mt-0.5 text-[0.66rem] leading-relaxed ${
                      line.highlight
                        ? 'text-pine-200/70'
                        : 'text-muted dark:text-pine-200/70'
                    }`}
                  >
                    {line.detail}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`font-display text-xl font-semibold leading-none ${
                    line.highlight
                      ? 'text-cream'
                      : 'text-pine-900 dark:text-cream'
                  }`}
                >
                  {line.number}
                </p>
                <p
                  className={`mt-1 text-[0.55rem] font-extrabold uppercase tracking-[0.12em] ${
                    line.highlight
                      ? 'text-pine-300 group-hover:text-white'
                      : 'text-pine-600 dark:text-pine-300'
                  }`}
                >
                  Tap to call
                </p>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-2.5 text-[0.68rem] leading-relaxed text-muted dark:text-pine-200/65">
          {CRISIS_NOTE}
        </p>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.5rem] border border-pine-900/8 bg-white/70 p-5 sm:p-6 dark:border-white/10 dark:bg-[#0e221b]/85">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-100 text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-pine-600 dark:text-pine-300">
                Supporting someone
              </p>
              <h2 className="font-display text-xl font-semibold leading-tight text-pine-950 dark:text-cream">
                How to be the friend who helps.
              </h2>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {SUPPORT_TIPS.map((tip) => (
              <div
                key={tip.title}
                className="rounded-xl border border-pine-900/6 bg-cream/65 p-3.5 dark:border-white/10 dark:bg-pine-950/60"
              >
                <p className="text-xs font-bold text-pine-900 dark:text-cream">
                  {tip.title}
                </p>
                <p className="mt-1 text-[0.7rem] leading-relaxed text-muted dark:text-pine-200/70">
                  {tip.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-sun/20 bg-sun-soft/60 p-5 sm:p-6 dark:border-sun/25 dark:bg-sun/12">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[#8a6018] dark:bg-sun/20 dark:text-[#f2ca78]">
              <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-[#8a6018] dark:text-[#f2ca78]">
                Professional help
              </p>
              <h2 className="font-display text-xl font-semibold leading-tight text-[#4e3810] dark:text-[#f7e7c2]">
                When talking to a professional is the next step.
              </h2>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {PROFESSIONAL_SIGNS.map((sign) => (
              <li
                key={sign}
                className="flex items-start gap-2 text-[0.72rem] leading-relaxed text-[#6b4a12] dark:text-[#e8d2a0]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a6018]/60 dark:bg-[#f2ca78]/70" />
                {sign}
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-xl border border-[#8a6018]/12 bg-white/55 p-3.5 dark:border-sun/20 dark:bg-pine-950/55">
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-[#8a6018] dark:text-[#f2ca78]">
              Starting in Cagayan de Oro
            </p>
            <ol className="mt-2 space-y-2">
              {CDO_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-[#72511a] dark:text-[#e8d2a0]"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#8a6018]/12 text-[0.52rem] font-extrabold text-[#8a6018] dark:bg-sun/20 dark:text-[#f2ca78]">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600 dark:text-pine-300">
              Verified starting points
            </p>
            <h2 className="mt-1 font-display text-[1.55rem] font-semibold leading-tight text-pine-950 dark:text-cream">
              Links worth opening.
            </h2>
          </div>
          <ExternalLink className="h-4 w-4 text-pine-400 dark:text-pine-300" aria-hidden="true" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {RESOURCE_LINKS.map((resource) => (
            <a
              key={resource.name}
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start justify-between gap-3 rounded-2xl border border-pine-900/8 bg-white/65 p-4 transition hover:-translate-y-0.5 hover:border-pine-300 hover:bg-white hover:shadow-lift dark:border-white/10 dark:bg-[#0e221b]/80 dark:hover:border-pine-500/40 dark:hover:bg-[#132b22]"
            >
              <div>
                <p className="text-sm font-bold text-pine-950 dark:text-cream">
                  {resource.name}
                </p>
                <p className="mt-1 text-[0.7rem] leading-relaxed text-muted dark:text-pine-200/70">
                  {resource.detail}
                </p>
              </div>
              <ArrowUpRight
                className="mt-0.5 h-4 w-4 shrink-0 text-pine-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-pine-300"
                aria-hidden="true"
              />
            </a>
          ))}
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-pine-200/70 bg-pine-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-pine-500/25 dark:bg-pine-900/65">
        <div>
          <Badge tone="mint">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Prepare before the hard moment
          </Badge>
          <h2 className="mt-2 font-display text-xl font-semibold text-pine-950 dark:text-cream">
            Make a safety plan while your head is clear.
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted dark:text-pine-200/75">
            Warning signs, people to call, and ways to make your environment
            safer. It takes ten minutes and stays on this device.
          </p>
        </div>
        <Link
          to="/toolkit?tool=safety-plan"
          className={buttonStyles({
            variant: 'primary',
            size: 'md',
            className: 'shrink-0',
          })}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Open safety plan
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      <SafetyFooter />
    </PageShell>
  );
}
