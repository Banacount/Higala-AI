import { useEffect, useRef } from 'react';
import { ArrowUp, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  loading,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
}) {
  const { openCrisis } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="rounded-[1.4rem] border border-pine-900/10 bg-white/85 p-2 shadow-[0_18px_50px_-30px_rgba(7,37,28,.45)] backdrop-blur-sm transition-colors focus-within:border-pine-400/60 focus-within:bg-white"
    >
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
          <span className="hidden text-[0.58rem] font-medium text-muted/55 sm:inline">
            Enter to send · Shift + Enter for a new line
          </span>
        </div>
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
    </form>
  );
}
