import clsx from 'clsx';
import { LifeBuoy } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function CrisisSupportNote({
  className,
}: {
  className?: string;
}) {
  const { openCrisis } = useApp();

  return (
    <div
      className={clsx(
        'rounded-2xl border border-sun/25 bg-sun-soft/75 p-4',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[#8a6018]">
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#6f5417]">
              That sounds heavy. You do not have to carry it alone.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#7a5a17]/85">
              Sharing here is okay, but a real person can help right now. Crisis
              support is free and confidential.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCrisis}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-pine-900 px-3.5 py-2 text-[0.68rem] font-bold text-cream transition hover:bg-pine-800 sm:self-auto"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          Open support
        </button>
      </div>
    </div>
  );
}
