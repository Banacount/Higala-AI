import { ArrowUp } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { VoicePlayer } from '@/components/chat/VoicePlayer';
import type { VoiceRecording } from '@/hooks/useVoiceRecorder';

export function VoiceRecorderPanel({
  mode,
  elapsedMs,
  recording,
  sending,
  onStop,
  onCancel,
  onSend,
}: {
  mode: 'recording' | 'preview';
  elapsedMs: number;
  recording: VoiceRecording | null;
  sending: boolean;
  onStop: () => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  if (mode === 'recording') {
    return (
      <div className="flex min-h-[48px] items-center gap-2.5 px-2.5 py-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-clay" />
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-pine-950 dark:text-cream">
          {formatDuration(elapsedMs)}
        </span>
        <span className="min-w-0 truncate text-xs text-muted/70 dark:text-pine-200/65">
          Recording… tap Stop when you are done
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-2.5 py-1.5 text-[0.68rem] font-bold text-muted transition hover:bg-pine-50 hover:text-pine-800 dark:text-pine-200/75 dark:hover:bg-white/[0.08] dark:hover:text-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStop}
            className="rounded-full bg-clay px-3 py-1.5 text-[0.68rem] font-bold text-cream transition hover:bg-clay/90 active:scale-95"
          >
            Stop
          </button>
        </div>
      </div>
    );
  }

  if (!recording) return null;

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5">
      <VoicePlayer
        src={recording.url}
        durationMs={recording.durationMs}
        tone="light"
      />
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.08em] text-muted/60 dark:text-pine-200/60">
          Preview · {formatDuration(recording.durationMs)}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-2.5 py-1.5 text-[0.68rem] font-bold text-muted transition hover:bg-pine-50 hover:text-pine-800 dark:text-pine-200/75 dark:hover:bg-white/[0.08] dark:hover:text-cream"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-full bg-pine-900 px-3 py-1.5 text-[0.68rem] font-bold text-cream transition hover:bg-pine-800 active:scale-95 disabled:pointer-events-none disabled:bg-pine-200 disabled:text-pine-600 dark:bg-pine-500 dark:text-pine-950 dark:hover:bg-pine-400 dark:disabled:bg-pine-900/60 dark:disabled:text-pine-500"
          >
            <ArrowUp className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
            Send voice
          </button>
        </div>
      </div>
    </div>
  );
}
