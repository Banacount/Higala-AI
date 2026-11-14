import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageHeader, PageShell, SafetyFooter } from '@/components/PageShell';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ToolCard } from '@/components/tools/ToolCard';
import { BreathingTool } from '@/components/tools/BreathingTool';
import { GroundingTool } from '@/components/tools/GroundingTool';
import { ThoughtRecordTool } from '@/components/tools/ThoughtRecordTool';
import { AngerTool } from '@/components/tools/AngerTool';
import { SafetyPlanTool } from '@/components/tools/SafetyPlanTool';
import { TOOL_DETAILS } from '@/lib/constants';
import type { ToolId } from '@/shared/types';

type OpenableTool = Exclude<ToolId, 'none' | 'mood-check'>;

const MODAL_SIZES: Record<OpenableTool, 'lg' | 'xl'> = {
  breathing: 'lg',
  grounding: 'lg',
  'thought-record': 'xl',
  'anger-pause': 'lg',
  'safety-plan': 'xl',
};

function isOpenableTool(value: string | null): value is OpenableTool {
  return (
    value === 'breathing' ||
    value === 'grounding' ||
    value === 'thought-record' ||
    value === 'anger-pause' ||
    value === 'safety-plan'
  );
}

function ToolContent({ id }: { id: OpenableTool }) {
  switch (id) {
    case 'breathing':
      return <BreathingTool />;
    case 'grounding':
      return <GroundingTool />;
    case 'thought-record':
      return <ThoughtRecordTool />;
    case 'anger-pause':
      return <AngerTool />;
    case 'safety-plan':
      return <SafetyPlanTool />;
  }
}

export function ToolkitPage() {
  const { openCrisis } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTool = searchParams.get('tool');
  const activeTool = isOpenableTool(rawTool) ? rawTool : null;
  const details = activeTool ? TOOL_DETAILS[activeTool] : null;

  const close = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Structured support"
        title={
          <>
            Tools for{' '}
            <span className="italic text-pine-600 dark:text-pine-300">
              hard moments.
            </span>
          </>
        }
        subtitle="Small, concrete tools for when your head is loud. No toxic positivity—just a next step you can actually take."
        action={
          <button
            type="button"
            onClick={openCrisis}
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Need help now
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-pine-900/8 bg-white/65 p-4 dark:border-white/10 dark:bg-[#0e221b]/80">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine-100 text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
            <Sprout className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="mt-2 text-xs font-bold text-pine-950 dark:text-cream">
            Start small
          </p>
          <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted dark:text-pine-200/70">
            Pick the tool that matches your body, not the one that sounds most
            impressive.
          </p>
        </div>
        <div className="rounded-2xl border border-pine-900/8 bg-white/65 p-4 dark:border-white/10 dark:bg-[#0e221b]/80">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sun-soft text-[#8a6018] dark:bg-sun/15 dark:text-[#f2ca78]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="mt-2 text-xs font-bold text-pine-950 dark:text-cream">
            No perfection
          </p>
          <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted dark:text-pine-200/70">
            A tool is not a test. Skip a step, stop early, come back later.
          </p>
        </div>
        <div className="rounded-2xl border border-pine-900/8 bg-white/65 p-4 dark:border-white/10 dark:bg-[#0e221b]/80">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-clay-soft text-clay dark:bg-clay/20 dark:text-[#f0a587]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="mt-2 text-xs font-bold text-pine-950 dark:text-cream">
            Safety first
          </p>
          <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted dark:text-pine-200/70">
            If you cannot keep yourself safe, stop and call 911 or 1553.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCard id="breathing" />
        <ToolCard id="grounding" />
        <ToolCard id="thought-record" />
        <ToolCard id="anger-pause" />
        <ToolCard id="safety-plan" />
        <ToolCard id="mood-check" />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-pine-200/70 bg-pine-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-pine-500/25 dark:bg-pine-900/65">
        <div>
          <Badge tone="mint">No tool fits right now?</Badge>
          <h2 className="mt-2 font-display text-xl font-semibold text-pine-950 dark:text-cream">
            Sometimes you just need to say it out loud.
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted dark:text-pine-200/75">
            Higala can listen, challenge the thought, or help you make one small
            plan. You do not need to be in a crisis to deserve support.
          </p>
        </div>
        <Link
          to="/chat"
          className={buttonStyles({
            variant: 'primary',
            size: 'md',
            className: 'shrink-0',
          })}
        >
          Talk to Higala
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <SafetyFooter />

      {activeTool && details ? (
        <Modal
          open
          onClose={close}
          title={details.title}
          eyebrow={details.english}
          description={details.description}
          size={MODAL_SIZES[activeTool]}
        >
          <ToolContent id={activeTool} />
        </Modal>
      ) : null}
    </PageShell>
  );
}
