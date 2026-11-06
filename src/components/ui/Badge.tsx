import clsx from 'clsx';
import type { ReactNode } from 'react';

type Tone = 'pine' | 'mint' | 'cream' | 'sun' | 'clay' | 'outline' | 'dark';

const TONES: Record<Tone, string> = {
  pine: 'bg-pine-100 text-pine-800',
  mint: 'bg-pine-50 text-pine-700 border border-pine-200/70',
  cream: 'bg-white/70 text-pine-900 border border-pine-900/8',
  sun: 'bg-sun-soft text-[#8a6018]',
  clay: 'bg-clay-soft text-clay',
  outline: 'border border-pine-900/15 text-pine-900',
  dark: 'bg-white/10 text-pine-100 border border-white/10',
};

export function Badge({
  children,
  tone = 'pine',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.13em]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
