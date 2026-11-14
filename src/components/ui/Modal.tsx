import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: Size;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-pine-950/60 backdrop-blur-[3px] animate-fade-in dark:bg-black/75 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={clsx(
          'relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/60 bg-cream shadow-soft animate-rise dark:border-white/12 dark:bg-[#0d1f18] sm:max-h-[90dvh] sm:rounded-[2rem]',
          SIZES[size],
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-pine-900/12 dark:bg-white/15 sm:hidden" />
        <div className="flex items-start justify-between gap-5 px-5 pb-4 pt-4 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.18em] text-pine-600 dark:text-pine-300">
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="font-display text-2xl font-semibold leading-tight text-pine-950 dark:text-cream sm:text-[1.7rem]"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted dark:text-pine-200/70"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine-900/6 text-pine-900 transition hover:bg-pine-900/10 dark:bg-white/10 dark:text-pine-100 dark:hover:bg-white/15"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-7">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-pine-900/8 bg-cream/95 px-5 py-4 dark:border-white/10 dark:bg-[#0d1f18]/95 sm:px-7">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
