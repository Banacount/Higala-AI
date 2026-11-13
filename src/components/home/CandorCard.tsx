import { ArrowUpRight } from 'lucide-react';
import { buttonStyles } from '@/components/ui/Button';

export function CandorCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="flex h-full flex-col rounded-[1.55rem] border border-pine-200/70 bg-pine-50/70 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-pine-600">
          The Higala way
        </p>
        <span className="text-[0.56rem] font-extrabold uppercase tracking-[0.14em] text-pine-600/50">
          Higalaay
        </span>
      </div>

      <p className="mt-3 font-display text-[1.4rem] font-medium leading-[1.25] text-pine-950">
        “Dili mi moingon nga okay ra kung dili.”
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        We won’t say it’s okay when it isn’t. That is avoidance, not kindness.
      </p>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onOpen}
          className={buttonStyles({
            variant: 'secondary',
            size: 'sm',
            className: 'w-full justify-between',
          })}
        >
          Why no yes-man?
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
