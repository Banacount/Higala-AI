import { useState, type FormEvent } from 'react';
import { CheckCircle2, Save, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { DISTORTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { formatShortDateTime } from '@/lib/utils';

const EMPTY_FORM = {
  situation: '',
  thought: '',
  distortions: [] as string[],
  evidenceFor: '',
  evidenceAgainst: '',
  balancedThought: '',
};

export function ThoughtRecordTool() {
  const { addThoughtRecord, thoughtRecords } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const toggleDistortion = (id: string) => {
    setForm((current) => ({
      ...current,
      distortions: current.distortions.includes(id)
        ? current.distortions.filter((item) => item !== id)
        : [...current.distortions, id],
    }));
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!form.situation.trim() || !form.thought.trim()) {
      setError('Write down what happened and what your mind told you first.');
      return;
    }
    addThoughtRecord({
      situation: form.situation.trim(),
      thought: form.thought.trim(),
      distortions: form.distortions,
      evidenceFor: form.evidenceFor.trim(),
      evidenceAgainst: form.evidenceAgainst.trim(),
      balancedThought: form.balancedThought.trim(),
    });
    setForm(EMPTY_FORM);
    setError('');
    setSaved(true);
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-2xl border border-sun/20 bg-sun-soft/70 px-3.5 py-2.5 dark:border-sun/25 dark:bg-sun/12">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6018] dark:text-[#f2ca78]"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-[#72511a] dark:text-[#e8d2a0]">
          This is not about “positive thinking.” It is about accuracy. A truer
          thought is not always a happier one—but it is easier to live with.
        </p>
      </div>

      {saved ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-pine-200 bg-pine-50 p-3.5 dark:border-pine-500/30 dark:bg-pine-900/70">
          <div className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-pine-600 dark:text-pine-300"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-bold text-pine-900 dark:text-cream">
                Saved on this device.
              </p>
              <p className="mt-0.5 text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/70">
                You can come back to this. For now, take one slow breath.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="shrink-0 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-pine-600 dark:text-pine-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="thought-situation"
            className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300"
          >
            01 · What happened?
          </label>
          <p className="mb-1.5 mt-0.5 text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
            Facts first. Where were you, who was there, what was said?
          </p>
          <textarea
            id="thought-situation"
            value={form.situation}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                situation: event.target.value.slice(0, 1_200),
              }))
            }
            rows={2}
            placeholder="e.g. My manager said my report was incomplete in front of the team."
            className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
          />
        </div>

        <div>
          <label
            htmlFor="thought-automatic"
            className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300"
          >
            02 · What did your mind say?
          </label>
          <p className="mb-1.5 mt-0.5 text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
            The first sentence that showed up. Do not clean it up.
          </p>
          <textarea
            id="thought-automatic"
            value={form.thought}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                thought: event.target.value.slice(0, 1_200),
              }))
            }
            rows={2}
            placeholder="e.g. I’m lazy. I’m completely useless here."
            className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
          />
        </div>

        <div>
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300">
            03 · Which thinking traps fit?
          </p>
          <p className="mb-2 mt-0.5 text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
            Choose any that fit. No need to be perfect.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DISTORTIONS.map((distortion) => {
              const selected = form.distortions.includes(distortion.id);
              return (
                <button
                  key={distortion.id}
                  type="button"
                  onClick={() => toggleDistortion(distortion.id)}
                  aria-pressed={selected}
                  title={distortion.example}
                  className={`rounded-full border px-2.5 py-1.5 text-[0.66rem] font-bold transition ${
                    selected
                      ? 'border-pine-600 bg-pine-900 text-cream dark:border-pine-400 dark:bg-pine-600 dark:text-white'
                      : 'border-pine-900/10 bg-white/65 text-pine-800 hover:border-pine-300 dark:border-white/10 dark:bg-pine-950/60 dark:text-pine-100 dark:hover:border-pine-400/50 dark:hover:bg-pine-900/70'
                  }`}
                >
                  {distortion.en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="thought-evidence-for"
              className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300"
            >
              04 · Evidence that supports it
            </label>
            <p className="mb-1.5 mt-0.5 text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
              What makes the thought feel true?
            </p>
            <textarea
              id="thought-evidence-for"
              value={form.evidenceFor}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  evidenceFor: event.target.value.slice(0, 1_200),
                }))
              }
              rows={3}
              placeholder="Facts, not feelings."
              className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
            />
          </div>
          <div>
            <label
              htmlFor="thought-evidence-against"
              className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300"
            >
              05 · Evidence against it
            </label>
            <p className="mb-1.5 mt-0.5 text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
              What does the thought ignore?
            </p>
            <textarea
              id="thought-evidence-against"
              value={form.evidenceAgainst}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  evidenceAgainst: event.target.value.slice(0, 1_200),
                }))
              }
              rows={3}
              placeholder="Small counterexamples count."
              className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="thought-balanced"
            className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300"
          >
            06 · A truer, more balanced thought
          </label>
          <p className="mb-1.5 mt-0.5 text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
            Not “everything is great.” Just more accurate and more fair to
            yourself.
          </p>
          <textarea
            id="thought-balanced"
            value={form.balancedThought}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                balancedThought: event.target.value.slice(0, 1_200),
              }))
            }
            rows={3}
            placeholder="e.g. I missed a section on this report, but that doesn’t mean I’m useless. I can learn from it and fix it."
            className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-clay-soft px-3 py-2 text-xs font-semibold text-clay dark:bg-clay/20 dark:text-[#f6b8a0]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
          Saved only on this device.
        </p>
        <Button type="submit" className="sm:min-w-[180px]">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save thought check
        </Button>
      </div>

      {thoughtRecords.length > 0 ? (
        <details className="group rounded-2xl border border-pine-900/8 bg-white/60 p-3.5 dark:border-white/10 dark:bg-pine-950/55">
          <summary className="cursor-pointer list-none text-xs font-bold text-pine-800 marker:hidden dark:text-cream">
            <span className="flex items-center justify-between gap-2">
              Recent thought checks ({thoughtRecords.length})
              <span className="text-pine-500 transition group-open:rotate-180 dark:text-pine-300">
                ▾
              </span>
            </span>
          </summary>
          <div className="mt-3 space-y-2">
            {thoughtRecords.slice(0, 4).map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-pine-900/6 bg-cream/70 p-3 dark:border-white/10 dark:bg-[#0e221b]/80"
              >
                <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-pine-500 dark:text-pine-300">
                  {formatShortDateTime(record.createdAt)}
                </p>
                <p className="mt-1 text-xs font-semibold leading-snug text-pine-950 dark:text-cream">
                  {record.situation}
                </p>
                {record.balancedThought ? (
                  <p className="mt-1 text-[0.68rem] leading-relaxed text-pine-900/65 dark:text-pine-100/75">
                    → {record.balancedThought}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </form>
  );
}
