import { Link } from 'react-router-dom';
import { ArrowRight, Ban, Ear, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { buttonStyles } from '@/components/ui/Button';

const PRINCIPLES = [
  {
    icon: Ear,
    title: 'Validation is not agreement',
    body: 'Higala will believe that your feelings are real. That does not mean every conclusion your mind reached is true. Being heard and being told “yes” are different kinds of care.',
  },
  {
    icon: Ban,
    title: 'Care means naming what hurts you',
    body: 'If you are avoiding something, hurting someone, or repeating a pattern, Higala will say so—kindly and specifically. A friend who never challenges you is not keeping you safe.',
  },
  {
    icon: ShieldCheck,
    title: 'You stay in the driver’s seat',
    body: 'Higala will not decide for you, shame you, or pretend to be a therapist. The goal is not dependence on the app. It is a clearer next step you can own.',
  },
];

export function CandorExplainer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Why Higala won’t just agree with you"
      eyebrow="The Higala way"
      description="True friendship is not flattery. It is the kind of honesty that tells you the truth because it wants you to be free."
      size="lg"
    >
      <div className="space-y-5">
        <div className="rounded-[1.5rem] bg-pine-900 p-5 text-cream dark:border dark:border-white/10 dark:bg-pine-950 sm:p-6">
          <p className="font-display text-xl leading-snug sm:text-2xl">
            “A yes-man makes you feel heard for a moment. A real friend helps
            you tell the truth for longer.”
          </p>
          <p className="mt-3 text-xs leading-relaxed text-pine-200/80">
            Radical candour is not cruelty. It is honesty with warmth, and
            honesty without warmth is just noise.
          </p>
        </div>

        <div className="space-y-3">
          {PRINCIPLES.map((principle, index) => (
            <div
              key={principle.title}
              className="flex gap-3.5 rounded-2xl border border-pine-900/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-100 text-pine-700 dark:bg-pine-900/80 dark:text-pine-300">
                <principle.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.62rem] font-extrabold tracking-[0.16em] text-pine-500 dark:text-pine-400">
                    0{index + 1}
                  </span>
                  <h3 className="text-sm font-bold text-pine-950 dark:text-cream">
                    {principle.title}
                  </h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted dark:text-pine-200/70">
                  {principle.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-sun-soft p-4 dark:border dark:border-sun/25 dark:bg-sun/12">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#8a6018] dark:text-[#f2ca78]">
            What Higala is not
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#72511a] dark:text-[#e8d2a0]">
            Not a therapist. Not a crisis hotline. Not a replacement for real
            people. Not a machine that will tell you what you want to hear.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            to="/toolkit"
            onClick={onClose}
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            See the tools
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles({ variant: 'primary', size: 'md' })}
          >
            I get it
          </button>
        </div>
      </div>
    </Modal>
  );
}
