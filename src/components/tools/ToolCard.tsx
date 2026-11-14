import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { ToolId } from '@/shared/types';
import { TOOL_DETAILS } from '@/lib/constants';
import { ToolIcon } from '@/components/tools/ToolIcon';

const TONES = {
  pine: {
    card: 'border-pine-900/8 bg-white/75 hover:border-pine-300 dark:border-white/10 dark:bg-[#0e221b]/85 dark:hover:border-pine-500/40',
    icon: 'bg-pine-100 text-pine-700 dark:bg-pine-800/80 dark:text-pine-200',
    title: 'text-pine-950 dark:text-cream',
    body: 'text-muted dark:text-pine-200/70',
    meta: 'text-pine-600 dark:text-pine-300',
    arrow: 'text-pine-400 dark:text-pine-300',
  },
  mint: {
    card: 'border-pine-200/70 bg-pine-50 hover:border-pine-300 dark:border-pine-500/25 dark:bg-pine-900/65 dark:hover:border-pine-400/50',
    icon: 'bg-white text-pine-700 dark:bg-pine-950/75 dark:text-pine-200',
    title: 'text-pine-950 dark:text-cream',
    body: 'text-pine-900/60 dark:text-pine-100/75',
    meta: 'text-pine-600 dark:text-pine-300',
    arrow: 'text-pine-400 dark:text-pine-300',
  },
  sun: {
    card: 'border-sun/20 bg-sun-soft/70 hover:border-sun/40 dark:border-sun/25 dark:bg-sun/12 dark:hover:border-sun/45',
    icon: 'bg-white/70 text-[#8a6018] dark:bg-sun/20 dark:text-[#f2ca78]',
    title: 'text-[#4e3810] dark:text-[#f7e7c2]',
    body: 'text-[#72511a]/75 dark:text-[#e8d2a0]/85',
    meta: 'text-[#8a6018] dark:text-[#f2ca78]',
    arrow: 'text-[#b78632] dark:text-[#f2ca78]',
  },
  clay: {
    card: 'border-clay/15 bg-clay-soft/70 hover:border-clay/30 dark:border-clay/30 dark:bg-clay/15 dark:hover:border-clay/50',
    icon: 'bg-white/70 text-clay dark:bg-clay/25 dark:text-[#f0a587]',
    title: 'text-[#5e2c18] dark:text-[#f6d0c0]',
    body: 'text-[#7a4128]/75 dark:text-[#eab9a6]/85',
    meta: 'text-clay dark:text-[#f0a587]',
    arrow: 'text-[#c47a5a] dark:text-[#f0a587]',
  },
  deep: {
    card: 'border-pine-950 bg-pine-950 text-cream hover:border-pine-700 dark:border-white/12 dark:bg-pine-950 dark:hover:border-pine-500/50',
    icon: 'bg-white/10 text-pine-200',
    title: 'text-cream',
    body: 'text-pine-100/60',
    meta: 'text-pine-300',
    arrow: 'text-pine-300',
  },
} as const;

export function ToolCard({
  id,
  className = '',
}: {
  id: Exclude<ToolId, 'none'>;
  className?: string;
}) {
  const tool = TOOL_DETAILS[id];
  const tone = TONES[tool.tone];
  const href = id === 'mood-check' ? '/mood' : `/toolkit?tool=${id}`;

  return (
    <Link
      to={href}
      className={`group flex flex-col rounded-[1.35rem] border p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift ${tone.card} ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone.icon}`}
        >
          <ToolIcon id={id} className="h-5 w-5" />
        </span>
        <span
          className={`rounded-full bg-white/55 px-2 py-1 text-[0.56rem] font-extrabold uppercase tracking-[0.12em] dark:bg-white/10 ${tone.meta}`}
        >
          {tool.duration}
        </span>
      </div>
      <h3 className={`font-display text-[1.2rem] font-semibold leading-tight ${tone.title}`}>
        {tool.title}
      </h3>
      <p className={`mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.11em] ${tone.meta}`}>
        {tool.english}
      </p>
      <p className={`mt-2 flex-1 text-xs leading-relaxed ${tone.body}`}>
        {tool.description}
      </p>
      <span
        className={`mt-3 inline-flex items-center gap-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] ${tone.meta}`}
      >
        Open
        <ArrowUpRight
          className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${tone.arrow}`}
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
