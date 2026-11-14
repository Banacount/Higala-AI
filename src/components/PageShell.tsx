import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { HeartHandshake, LifeBuoy } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-10 lg:pb-14 lg:pt-9',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={clsx(
        'mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-pine-600 dark:text-pine-300">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-balance font-display text-3xl font-semibold leading-[1.08] text-pine-950 dark:text-cream sm:text-[2.55rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted dark:text-pine-200/70 sm:text-[0.95rem]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SafetyFooter({ className }: { className?: string }) {
  const { openCrisis } = useApp();

  return (
    <footer
      className={clsx(
        'mt-10 border-t border-pine-900/8 pt-5 text-xs leading-relaxed text-muted dark:border-white/10 dark:text-pine-200/65',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex max-w-2xl items-start gap-2">
          <HeartHandshake
            className="mt-0.5 h-4 w-4 shrink-0 text-pine-600 dark:text-pine-400"
            aria-hidden="true"
          />
          <span>
            Higala is peer support, not a therapist or emergency service. In a
            crisis, call{' '}
            <a
              className="font-semibold text-pine-800 underline dark:text-pine-200"
              href="tel:911"
            >
              911
            </a>{' '}
            or{' '}
            <a
              className="font-semibold text-pine-800 underline dark:text-pine-200"
              href="tel:1553"
            >
              1553
            </a>
            .{' '}
            <Link
              to="/resources"
              className="font-semibold text-pine-800 underline underline-offset-2 dark:text-pine-200"
            >
              All crisis lines
            </Link>
          </span>
        </p>
        <button
          type="button"
          onClick={openCrisis}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-pine-100 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-pine-800 transition hover:bg-pine-200 dark:bg-pine-900/70 dark:text-pine-200 dark:hover:bg-pine-800 sm:self-auto"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          Need help now
        </button>
      </div>
    </footer>
  );
}
