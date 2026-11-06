import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  Phone,
  ShieldCheck,
  Siren,
  UserRoundCheck,
} from 'lucide-react';
import { CRISIS_LINES, CRISIS_NOTE } from '@/lib/constants';
import { useApp } from '@/context/AppContext';
import { buttonStyles } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function CrisisModal() {
  const { crisisOpen, closeCrisis } = useApp();

  return (
    <Modal
      open={crisisOpen}
      onClose={closeCrisis}
      title="You do not have to explain everything."
      eyebrow="Help right now"
      description="If you are in immediate danger, call 911. If you can, stay on the line with someone while you make the next call."
      size="lg"
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-clay-soft p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay text-white">
              <Siren className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#7a341c]">
                Immediate danger? Call 911 now.
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#8b4a31]">
                Do not wait until you feel “sure enough.” If you might act on a
                thought of harming yourself, that is enough reason to call.
              </p>
            </div>
          </div>
          <a
            href="tel:911"
            className={buttonStyles({
              variant: 'danger',
              size: 'sm',
              className: 'mt-3 w-full sm:mt-0 sm:w-auto',
            })}
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Call 911
          </a>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-pine-950">
              Philippines crisis lines
            </h3>
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-pine-600">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              24/7 where noted
            </span>
          </div>
          <div className="space-y-2.5">
            {CRISIS_LINES.filter((line) => line.highlight).map((line) => (
              <a
                key={line.name}
                href={`tel:${line.tel}`}
                className="group flex items-center justify-between gap-4 rounded-2xl bg-pine-900 p-4 text-cream transition hover:bg-pine-800"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Phone className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{line.name}</p>
                    <p className="text-xs text-pine-200/75">{line.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold leading-none">
                    {line.number}
                  </p>
                  <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-pine-300 group-hover:text-white">
                    Tap to call
                  </p>
                </div>
              </a>
            ))}

            <div className="grid gap-2.5 sm:grid-cols-2">
              {CRISIS_LINES.filter((line) => !line.highlight).map((line) => (
                <a
                  key={line.name}
                  href={`tel:${line.tel}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-pine-900/10 bg-white/70 p-3.5 transition hover:border-pine-900/20 hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-pine-950">
                      {line.name}
                    </p>
                    <p className="mt-0.5 text-[0.66rem] text-muted">
                      {line.detail}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold text-pine-800">
                      {line.number}
                    </p>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-pine-500">
                      Call
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-pine-900/8 bg-pine-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-pine-800">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-[0.12em]">
                While you wait
              </p>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-pine-900/80">
              <li>Move anything you could use to hurt yourself out of reach.</li>
              <li>Stay with someone, or ask someone to stay with you.</li>
              <li>Breathe out longer than you breathe in. Repeat.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-pine-900/8 bg-white/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-pine-800">
              <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-[0.12em]">
                What to say
              </p>
            </div>
            <p className="text-xs leading-relaxed text-pine-900/80">
              “I need help right now. I am thinking of hurting myself and I
              don’t feel safe alone.”
            </p>
            <p className="mt-2 text-[0.66rem] leading-relaxed text-muted">
              You do not need the perfect words. The person on the line is there
              for this.
            </p>
          </div>
        </div>

        <p className="text-[0.7rem] leading-relaxed text-muted">{CRISIS_NOTE}</p>

        <Link
          to="/resources"
          onClick={closeCrisis}
          className={buttonStyles({
            variant: 'soft',
            size: 'md',
            className: 'w-full',
          })}
        >
          See all support options
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Modal>
  );
}
