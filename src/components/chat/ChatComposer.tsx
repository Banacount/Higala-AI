import { useEffect, useRef } from 'react';
import {
  ArrowUp,
  LoaderCircle,
  Mic,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { VoiceRecorderPanel } from '@/components/chat/VoiceRecorderPanel';

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  onSendVoice,
  loading,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSendVoice: (blob: Blob, durationMs: number) => void;
  loading: boolean;
}) {
  const { openCrisis } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorder = useVoiceRecorder();
  const active =
    recorder.status === 'recording' || recorder.status === 'preview';

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [draft]);

  const submit = () => {
    if (!draft.trim() || loading) return;
    onSend();
  };

  const sendVoice = () => {
    if (loading) return;
    const current = recorder.consume();
    if (!current) return;
    onSendVoice(current.blob, current.durationMs);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="rounded-[1.4rem] border border-pine-900/10 bg-white p-2 shadow-[0_18px_50px_-30px_rgba(7,37,28,.45)] transition-colors focus-within:border-pine-400/60 focus-within:bg-white"
    >
      {active ? (
        <VoiceRecorderPanel
          mode={recorder.status === 'recording' ? 'recording' : 'preview'}
          elapsedMs={recorder.elapsedMs}
          recording={recorder.recording}
          sending={loading}
          onStop={recorder.stop}
          onCancel={recorder.cancel}
          onSend={sendVoice}
        />
      ) : (
        <>
          <label htmlFor="chat-message" className="sr-only">
            Message Higala
          </label>
          <textarea
            ref={textareaRef}
            id="chat-message"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value.slice(0, 2_000))}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Isulti ang tinuod… even if it’s messy."
            className="max-h-[168px] min-h-[48px] w-full resize-none bg-transparent px-3 py-2.5 text-[0.94rem] leading-relaxed text-ink outline-none placeholder:text-muted/55"
          />
        </>
      )}

      <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={openCrisis}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-clay/85 transition hover:bg-clay-soft hover:text-clay"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Need help now
          </button>
          {active ? null : (
            <span className="hidden text-[0.58rem] font-medium text-muted/55 sm:inline">
              Enter to send · Shift + Enter for a new line
            </span>
          )}
        </div>

        {active ? null : (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void recorder.start()}
              disabled={
                loading ||
                recorder.status === 'requesting' ||
                !recorder.supported
              }
              aria-label="Record a voice message"
              title={
                recorder.supported
                  ? 'Record a voice message'
                  : 'Voice recording is not supported in this browser'
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pine-900/10 bg-pine-50 text-pine-800 transition hover:bg-pine-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              {recorder.status === 'requesting' ? (
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              aria-label={loading ? 'Sending' : 'Send message'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-900 text-cream transition hover:bg-pine-800 active:scale-95 disabled:pointer-events-none disabled:bg-pine-200 disabled:text-pine-600"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </div>

      {recorder.error ? (
        <div
          role="alert"
          className="mt-1 flex items-start justify-between gap-2 rounded-xl bg-clay-soft/70 px-2.5 py-1.5"
        >
          <p className="text-[0.66rem] leading-relaxed text-clay">
            {recorder.error}
          </p>
          <button
            type="button"
            onClick={recorder.dismissError}
            className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[0.58rem] font-bold text-pine-800"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </form>
  );
}
