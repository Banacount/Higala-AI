import { LifeBuoy, Phone, ShieldAlert } from 'lucide-react';
import type { RiskLevel } from '@/shared/types';
import { useApp } from '@/context/AppContext';

export function ChatCrisisStrip({ riskLevel }: { riskLevel: RiskLevel }) {
  const { openCrisis } = useApp();
  if (riskLevel !== 'elevated' && riskLevel !== 'crisis') return null;

  const crisis = riskLevel === 'crisis';

  return (
    <div
      className={`mb-2.5 flex flex-col gap-2 rounded-2xl border px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
        crisis
          ? 'border-clay/20 bg-clay-soft dark:border-clay/35 dark:bg-clay/15'
          : 'border-sun/25 bg-sun-soft/80 dark:border-sun/30 dark:bg-sun/15'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            crisis
              ? 'bg-clay text-white'
              : 'bg-sun/15 text-[#8a6018] dark:bg-sun/25 dark:text-[#f2ca78]'
          }`}
        >
          {crisis ? (
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
        <div>
          <p
            className={`text-[0.72rem] font-bold ${
              crisis
                ? 'text-[#7a341c] dark:text-[#f6b8a0]'
                : 'text-[#72511a] dark:text-[#f2ca78]'
            }`}
          >
            {crisis
              ? 'Your safety matters more than this conversation.'
              : 'That sounds heavy. Let’s keep you safe.'}
          </p>
          <p
            className={`text-[0.65rem] leading-relaxed ${
              crisis
                ? 'text-[#8b4a31] dark:text-[#eab9a6]'
                : 'text-[#7b5b25] dark:text-[#e8d2a0]'
            }`}
          >
            {crisis
              ? 'If you might act on these thoughts, call 1553 or 911 now. A human being can stay with you.'
              : 'If you are thinking of hurting yourself, tell me directly—and call 1553 if you need a human right now.'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5 pl-9 sm:pl-0">
        <a
          href="tel:1553"
          className="inline-flex items-center gap-1 rounded-full bg-pine-900 px-2.5 py-1.5 text-[0.62rem] font-bold text-cream transition hover:bg-pine-800 dark:bg-pine-500 dark:text-pine-950 dark:hover:bg-pine-400"
        >
          <Phone className="h-3 w-3" aria-hidden="true" />
          Call 1553
        </a>
        <button
          type="button"
          onClick={openCrisis}
          className="rounded-full bg-white/70 px-2.5 py-1.5 text-[0.62rem] font-bold text-pine-900 transition hover:bg-white dark:bg-white/10 dark:text-cream dark:hover:bg-white/15"
        >
          Open help
        </button>
      </div>
    </div>
  );
}
