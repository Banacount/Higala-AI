import { useState } from 'react';
import {
  Check,
  HandHeart,
  Heart,
  Loader2,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction as toggleReactionRequest } from '@/lib/communityClient';
import {
  COMMUNITY_REACTIONS,
  type CommunityReaction,
} from '@/shared/community';

interface SupportiveReactionsProps {
  postId: string;
  counts: Record<CommunityReaction, number>;
  myReactions: CommunityReaction[];
  onReactionChange?: (
    nextCounts: Record<CommunityReaction, number>,
    nextMyReactions: CommunityReaction[],
  ) => void;
}

const REACTION_ICONS: Record<CommunityReaction, React.ComponentType<{ className?: string }>> = {
  'hear-you': Volume2,
  'not-alone': Users,
  'sending-support': Heart,
  'been-there': HandHeart,
  'thank-you': Sparkles,
};

/** Renders the supportive-reaction controls for a community post. */
export function SupportiveReactions({
  postId,
  counts,
  myReactions,
  onReactionChange,
}: SupportiveReactionsProps) {
  const { getIdToken } = useAuth();
  const [pendingReaction, setPendingReaction] = useState<CommunityReaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Optimistically toggles a reaction, rolling back if the request fails. */
  const handleToggle = async (reaction: CommunityReaction) => {
    if (pendingReaction) return; // Prevent duplicate requests while one is pending

    setPendingReaction(reaction);
    setError(null);

    const wasActive = myReactions.includes(reaction);
    const optimisticCounts = {
      ...counts,
      [reaction]: Math.max(0, (counts[reaction] ?? 0) + (wasActive ? -1 : 1)),
    };
    const optimisticMyReactions = wasActive
      ? myReactions.filter((r) => r !== reaction)
      : [...myReactions, reaction];

    // Optimistically update parent
    onReactionChange?.(optimisticCounts, optimisticMyReactions);

    try {
      const token = await getIdToken();
      const result = await toggleReactionRequest({ postId, reaction }, token);
      onReactionChange?.(result.reactionCounts, result.myReactions);
    } catch (cause) {
      // Rollback on failure
      onReactionChange?.(counts, myReactions);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not update your reaction. Please try again.',
      );
    } finally {
      setPendingReaction(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {COMMUNITY_REACTIONS.map((option) => {
          const isActive = myReactions.includes(option.id);
          const isPending = pendingReaction === option.id;
          const count = counts[option.id] ?? 0;
          const IconComponent = REACTION_ICONS[option.id];

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => void handleToggle(option.id)}
              disabled={isPending}
              aria-pressed={isActive}
              className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-60 ${
                isActive
                  ? 'border border-pine-600 bg-pine-100/90 font-semibold text-pine-900 shadow-xs ring-1 ring-pine-500/25 hover:bg-pine-200/80 dark:border-pine-400/70 dark:bg-pine-800/85 dark:text-cream dark:ring-pine-400/30 dark:hover:bg-pine-700/85'
                  : 'border border-pine-900/10 bg-white/70 text-pine-950/80 hover:border-pine-300 hover:bg-white dark:border-white/12 dark:bg-pine-950/65 dark:text-pine-100/85 dark:hover:border-pine-400/50 dark:hover:bg-pine-900/75'
              }`}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-pine-600 dark:text-pine-300" aria-hidden="true" />
              ) : isActive ? (
                <Check className="h-3.5 w-3.5 text-pine-700 dark:text-pine-200" aria-hidden="true" />
              ) : (
                <IconComponent className="h-3.5 w-3.5 text-pine-600/75 transition group-hover:text-pine-800 dark:text-pine-300/80 dark:group-hover:text-pine-200" />
              )}
              <span>{option.label}</span>
              {count > 0 ? (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[0.68rem] font-bold ${
                    isActive
                      ? 'bg-pine-200/80 text-pine-900 dark:bg-pine-700 dark:text-cream'
                      : 'bg-pine-900/6 text-muted dark:bg-white/10 dark:text-pine-200/75'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-xl bg-clay-soft px-3 py-1.5 text-xs font-semibold text-clay dark:bg-clay/20 dark:text-[#f6b8a0]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
