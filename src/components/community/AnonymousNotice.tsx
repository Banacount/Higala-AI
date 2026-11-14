import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import { COMMUNITY_PRIVACY_NOTE } from '@/shared/communityGuidelines';

export function AnonymousNotice({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-pine-900/8 bg-pine-50/75 p-4 dark:border-pine-500/25 dark:bg-pine-900/65',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-100 text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-pine-700 dark:text-pine-300">
            Publishing anonymously
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted dark:text-pine-200/75">
            {COMMUNITY_PRIVACY_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
}
