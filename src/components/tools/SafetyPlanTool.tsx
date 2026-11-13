import { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  LifeBuoy,
  Phone,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { formatShortDateTime } from '@/lib/utils';
import type { SafetyPlan } from '@/shared/types';

const FIELDS: Array<{
  key: keyof Omit<SafetyPlan, 'updatedAt'>;
  number: string;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: 'warningSigns',
    number: '01',
    label: 'Warning signs',
    hint: 'What thoughts, feelings, or situations tell you a crisis may be building?',
    placeholder: 'e.g. Thinking I am worthless; not sleeping for days; isolating myself.',
  },
  {
    key: 'copingStrategies',
    number: '02',
    label: 'Things I can do alone',
    hint: 'Small actions that help you get through the next hour.',
    placeholder: 'e.g. Take a warm shower, step outside for 5 minutes, 4-4-4 breathing, journal.',
  },
  {
    key: 'distractions',
    number: '03',
    label: 'People and places that distract me',
    hint: 'Where can you go, or who can you be around, without explaining everything?',
    placeholder: 'e.g. Go to my sister’s house; walk in the park; watch a movie with friends.',
  },
  {
    key: 'contacts',
    number: '04',
    label: 'People I can call',
    hint: 'Names and numbers. Include someone who can physically be with you.',
    placeholder: 'e.g. Mom — 09xx xxx xxxx; Joy — 09xx xxx xxxx; NCMH — 1553.',
  },
  {
    key: 'reasonsToLive',
    number: '05',
    label: 'Reasons to stay',
    hint: 'Not a speech. Just the small, specific things that matter to you.',
    placeholder: 'e.g. My dog waiting for me; my younger sibling; wanting to see the sea again.',
  },
  {
    key: 'environment',
    number: '06',
    label: 'Making my environment safer',
    hint: 'What can you remove, lock, or hand to someone else when things get bad?',
    placeholder: 'e.g. Ask my roommate to hold my medication; put away sharp objects; avoid staying alone in my room.',
  },
];

const EMPTY_PLAN: Omit<SafetyPlan, 'updatedAt'> = {
  warningSigns: '',
  copingStrategies: '',
  distractions: '',
  contacts: '',
  reasonsToLive: '',
  environment: '',
};

export function SafetyPlanTool() {
  const { safetyPlan, saveSafetyPlan } = useApp();
  const [form, setForm] = useState<Omit<SafetyPlan, 'updatedAt'>>({
    warningSigns: safetyPlan.warningSigns,
    copingStrategies: safetyPlan.copingStrategies,
    distractions: safetyPlan.distractions,
    contacts: safetyPlan.contacts,
    reasonsToLive: safetyPlan.reasonsToLive,
    environment: safetyPlan.environment,
  });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const setField = (key: keyof typeof EMPTY_PLAN, value: string) => {
    setForm((current) => ({ ...current, [key]: value.slice(0, 1_500) }));
    setSaved(false);
  };

  const save = () => {
    saveSafetyPlan(form);
    setSaved(true);
  };

  const copyPlan = async () => {
    const text = [
      'MY SAFETY PLAN — Higala-AI',
      '',
      ...FIELDS.map(
        (field) => `${field.label}:\n${form[field.key].trim() || '—'}`,
      ),
      '',
      'Crisis: 911 · NCMH 1553 · Hopeline (02) 8804 4673',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked.
    }
  };

  const hasContent = Object.values(form).some((value) => value.trim());

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-pine-900 p-4 text-cream">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-pine-200">
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">If you are in immediate danger</p>
            <p className="mt-0.5 text-[0.68rem] leading-relaxed text-pine-200/70">
              Call 911 or NCMH 1553 now. This plan supports you—it does not
              replace a human being who can be with you.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href="tel:911"
                className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[0.62rem] font-extrabold text-pine-950"
              >
                <Phone className="h-3 w-3" aria-hidden="true" />
                Call 911
              </a>
              <a
                href="tel:1553"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[0.62rem] font-extrabold text-cream"
              >
                <Phone className="h-3 w-3" aria-hidden="true" />
                Call 1553
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <div className="flex items-baseline gap-2">
              <span className="text-[0.58rem] font-extrabold tracking-[0.14em] text-pine-500">
                {field.number}
              </span>
              <label
                htmlFor={`safety-${field.key}`}
                className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-pine-800"
              >
                {field.label}
              </label>
            </div>
            <p className="mb-1.5 mt-0.5 text-[0.66rem] leading-relaxed text-muted">
              {field.hint}
            </p>
            <textarea
              id={`safety-${field.key}`}
              value={form[field.key]}
              onChange={(event) => setField(field.key, event.target.value)}
              rows={2}
              placeholder={field.placeholder}
              className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white"
            />
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-pine-200 bg-pine-50 px-3 py-2.5">
        <ShieldCheck
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-600"
          aria-hidden="true"
        />
        <p className="text-[0.65rem] leading-relaxed text-pine-900/70">
          This plan is saved only on this device. If you share this device,
          clear it in Settings. A plan is not a promise—if you cannot keep
          yourself safe, ask for help.
        </p>
      </div>

      {saved ? (
        <div className="flex items-center gap-2 rounded-2xl border border-pine-200 bg-pine-50 px-3 py-2.5 text-xs font-semibold text-pine-800">
          <CheckCircle2 className="h-4 w-4 text-pine-600" aria-hidden="true" />
          Plan saved on this device.
        </div>
      ) : safetyPlan.updatedAt ? (
        <p className="text-[0.66rem] text-muted">
          Last saved{' '}
          {formatShortDateTime(safetyPlan.updatedAt)}
          .
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          size="md"
          onClick={copyPlan}
          disabled={!hasContent}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy plan'}
        </Button>
        <Button size="md" onClick={save}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save safety plan
        </Button>
      </div>
    </div>
  );
}
