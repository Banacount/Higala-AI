import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageShell, SafetyFooter } from '@/components/PageShell';
import { CandorExplainer } from '@/components/CandorExplainer';
import { Welcome } from '@/components/home/Welcome';
import { DailyCheckIn } from '@/components/home/DailyCheckIn';
import { DailyQuestion } from '@/components/home/DailyQuestion';
import { CandorCard } from '@/components/home/CandorCard';
import { QuickTools } from '@/components/home/QuickTools';
import { formatLongDate } from '@/lib/utils';

export function HomePage() {
  const { openCrisis } = useApp();
  const [candorOpen, setCandorOpen] = useState(false);

  return (
    <PageShell>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-pine-600/75">
          Home · {formatLongDate()}
        </p>
        <button
          type="button"
          onClick={openCrisis}
          className="inline-flex items-center gap-1.5 rounded-full border border-pine-900/10 bg-white/55 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.09em] text-pine-700 transition hover:bg-white"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          Crisis help
        </button>
      </div>

      <Welcome />

      <div className="mt-3">
        <DailyCheckIn />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DailyQuestion />
        </div>
        <div className="lg:col-span-5">
          <CandorCard onOpen={() => setCandorOpen(true)} />
        </div>
      </div>

      <div className="mt-8">
        <QuickTools />
      </div>

      <SafetyFooter />
      <CandorExplainer open={candorOpen} onClose={() => setCandorOpen(false)} />
    </PageShell>
  );
}
