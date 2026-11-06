import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageShell, SafetyFooter } from '@/components/PageShell';
import { CandorExplainer } from '@/components/CandorExplainer';
import { Hero } from '@/components/home/Hero';
import { QuickMood } from '@/components/home/QuickMood';
import { Momentum } from '@/components/home/Momentum';
import { DailyQuestion } from '@/components/home/DailyQuestion';
import { CandorCard } from '@/components/home/CandorCard';
import { QuickTools } from '@/components/home/QuickTools';
import { formatLongDate } from '@/lib/utils';

export function HomePage() {
  const { openCrisis } = useApp();
  const [candorOpen, setCandorOpen] = useState(false);

  return (
    <PageShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-pine-600/75">
          Panimalay · {formatLongDate()}
        </p>
        <button
          type="button"
          onClick={openCrisis}
          className="inline-flex items-center gap-1.5 rounded-full border border-pine-900/10 bg-white/60 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.09em] text-pine-800 transition hover:bg-white"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          Crisis help
        </button>
      </div>

      <Hero />

      <div className="mt-4 grid gap-3 lg:mt-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <QuickMood />
        </div>
        <div className="lg:col-span-5">
          <Momentum />
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:mt-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DailyQuestion />
        </div>
        <div className="lg:col-span-5">
          <CandorCard onOpen={() => setCandorOpen(true)} />
        </div>
      </div>

      <div className="mt-6 lg:mt-8">
        <QuickTools />
      </div>

      <SafetyFooter />
      <CandorExplainer open={candorOpen} onClose={() => setCandorOpen(false)} />
    </PageShell>
  );
}
