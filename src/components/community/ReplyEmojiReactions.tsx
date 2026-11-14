import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Smile } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toggleReplyReaction as toggleReplyReactionRequest } from '@/lib/communityClient';
import {
  REPLY_EMOJIS,
  type ReplyEmoji,
} from '@/shared/community';

interface ReplyEmojiReactionsProps {
  postId: string;
  replyId: string;
  counts?: Record<string, number>;
  myReactions?: string[];
  onReactionChange?: (
    nextCounts: Record<string, number>,
    nextMyReactions: string[],
  ) => void;
}

/** Renders emoji reactions and an add-reaction picker for one reply. */
export function ReplyEmojiReactions({
  postId,
  replyId,
  counts = {},
  myReactions = [],
  onReactionChange,
}: ReplyEmojiReactionsProps) {
  const { getIdToken } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;

    /** Closes the picker when a pointer lands outside it. */
    function handlePointerDown(event: PointerEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setPickerOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [pickerOpen]);

  /** Optimistically toggles an emoji reaction, rolling back if the request fails. */
  const handleToggle = async (emoji: ReplyEmoji) => {
    if (pendingEmoji) return; // Prevent duplicate requests while one is pending

    setPendingEmoji(emoji);
    setError(null);
    setPickerOpen(false);

    const wasActive = myReactions.includes(emoji);
    const prevCount = counts[emoji] ?? 0;
    const newCount = Math.max(0, prevCount + (wasActive ? -1 : 1));

    const optimisticCounts = { ...counts };
    if (newCount > 0) {
      optimisticCounts[emoji] = newCount;
    } else {
      delete optimisticCounts[emoji];
    }

    const optimisticMyReactions = wasActive
      ? myReactions.filter((e) => e !== emoji)
      : [...myReactions, emoji];

    // Optimistically update parent
    onReactionChange?.(optimisticCounts, optimisticMyReactions);

    try {
      const token = await getIdToken();
      const result = await toggleReplyReactionRequest(
        { postId, replyId, emoji },
        token,
      );
      onReactionChange?.(result.reactionCounts, result.myReactions);
    } catch (cause) {
      // Rollback on failure
      onReactionChange?.(counts, myReactions);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not update reaction.',
      );
    } finally {
      setPendingEmoji(null);
    }
  };

  // Emojis that should be visible as pills (either have count > 0 or selected by current user)
  const visiblePills = REPLY_EMOJIS.filter(
    (option) => (counts[option.emoji] ?? 0) > 0 || myReactions.includes(option.emoji),
  );

  return (
    <div className="mt-2.5 relative flex flex-wrap items-center gap-1.5" ref={pickerRef}>
      {visiblePills.map((option) => {
        const isActive = myReactions.includes(option.emoji);
        const count = counts[option.emoji] ?? 0;
        const isPending = pendingEmoji === option.emoji;

        return (
          <button
            key={option.emoji}
            type="button"
            onClick={() => void handleToggle(option.emoji)}
            disabled={isPending}
            aria-pressed={isActive}
            aria-label={`${option.label}: ${count} reaction${count === 1 ? '' : 's'}`}
            title={option.label}
            className={`group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-60 ${
              isActive
                ? 'border border-pine-600 bg-pine-100/90 font-semibold text-pine-900 shadow-xs ring-1 ring-pine-500/25 hover:bg-pine-200/80 dark:border-pine-400/70 dark:bg-pine-800/85 dark:text-cream dark:ring-pine-400/30 dark:hover:bg-pine-700/85'
                : 'border border-pine-900/10 bg-white/70 text-ink/80 hover:border-pine-300 hover:bg-white dark:border-white/12 dark:bg-pine-950/65 dark:text-pine-100/85 dark:hover:border-pine-400/50 dark:hover:bg-pine-900/75'
            }`}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-pine-600 dark:text-pine-300" aria-hidden="true" />
            ) : (
              <span className="text-sm leading-none" role="img" aria-label={option.label}>
                {option.emoji}
              </span>
            )}
            {count > 0 ? (
              <span
                className={`text-[0.68rem] font-bold ${
                  isActive
                    ? 'text-pine-900 dark:text-cream'
                    : 'text-muted dark:text-pine-200/70'
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}

      {/* Add Reaction Picker Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((prev) => !prev)}
          disabled={pendingEmoji !== null}
          aria-expanded={pickerOpen}
          aria-label="Add emoji reaction"
          title="Add reaction"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-pine-900/15 bg-white/50 px-2 py-1 text-xs text-muted transition hover:border-pine-400 hover:bg-white hover:text-pine-800 disabled:opacity-50 dark:border-white/15 dark:bg-pine-950/55 dark:text-pine-200/70 dark:hover:border-pine-400/60 dark:hover:bg-pine-900/75 dark:hover:text-cream"
        >
          {visiblePills.length === 0 ? (
            <>
              <Smile className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[0.68rem] font-semibold">React</span>
            </>
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        {/* Floating Picker Popover */}
        {pickerOpen ? (
          <div className="animate-in fade-in zoom-in-95 absolute bottom-full left-0 z-20 mb-1.5 flex items-center gap-1 rounded-2xl border border-pine-900/10 bg-white p-1.5 shadow-[0_8px_24px_-8px_rgba(7,37,28,.25)] duration-100 dark:border-white/15 dark:bg-[#0e221b] dark:shadow-[0_12px_30px_-8px_rgba(0,0,0,.7)]">
            {REPLY_EMOJIS.map((option) => {
              const isActive = myReactions.includes(option.emoji);

              return (
                <button
                  key={option.emoji}
                  type="button"
                  onClick={() => void handleToggle(option.emoji)}
                  aria-pressed={isActive}
                  aria-label={option.label}
                  title={option.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-base transition hover:scale-125 hover:bg-pine-50 active:scale-100 dark:hover:bg-pine-800/70 ${
                    isActive
                      ? 'bg-pine-100 ring-1 ring-pine-500/30 dark:bg-pine-800 dark:ring-pine-400/50'
                      : ''
                  }`}
                >
                  <span role="img" aria-label={option.label}>
                    {option.emoji}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {error ? (
        <span className="ml-1 text-[0.66rem] font-semibold text-clay dark:text-[#f6b8a0]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
