import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CommunityApiError,
  getCommunityReplies,
} from '@/lib/communityClient';
import type { CommunityReply } from '@/shared/community';

const REPLIES_PAGE_SIZE = 20;

/** Loads and paginates replies, reconciling local creates/deletes with in-flight loads. */
export function useCommunityReplies(postId: string | undefined) {
  const { status: authStatus, getIdToken } = useAuth();
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const appendRequestId = useRef(0);
  const mutationVersion = useRef(0);
  const localAdds = useRef(
    new Map<string, { reply: CommunityReply; version: number }>(),
  );
  const localRemovals = useRef(new Map<string, number>());

  /**
   * Cancels in-flight append requests without discarding initial/refresh loads,
   * so a concurrent replacement load can still be applied.
   */
  const invalidatePendingAppends = useCallback(() => {
    appendRequestId.current += 1;
    setLoadingMore(false);
  }, []);

  /** Loads a replacement or append page and applies it only while still current. */
  const load = useCallback(
    async (options?: { append?: boolean; cursor?: string | null }) => {
      if (authStatus !== 'ready' || !postId) return;
      const append = options?.append === true;

      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;
      const currentAppend = append
        ? appendRequestId.current + 1
        : appendRequestId.current;
      const mutationAtStart = mutationVersion.current;
      if (append) {
        appendRequestId.current = currentAppend;
        setLoadingMore(true);
      } else {
        // A replacement load supersedes any append that is still in flight.
        appendRequestId.current += 1;
        setLoading(true);
        setError(null);
      }

      /** Whether this request is still the newest request of its kind. */
      const isCurrent = () =>
        requestId.current === currentRequest &&
        (!append || appendRequestId.current === currentAppend);

      try {
        const token = await getIdToken();
        const result = await getCommunityReplies(
          postId,
          token,
          { cursor: append ? options?.cursor ?? null : null, limit: REPLIES_PAGE_SIZE },
        );
        if (!isCurrent()) return;
        setReplies((prev) => {
          if (append) {
            return [
              ...prev,
              ...result.replies.filter((r) => !prev.some((p) => p.id === r.id)),
            ];
          }

          // A replacement response may predate a local create/delete, so
          // re-apply mutations that happened while it was in flight.
          const merged = result.replies.filter((reply) => {
            const removedAt = localRemovals.current.get(reply.id);
            return removedAt === undefined || removedAt <= mutationAtStart;
          });
          const seen = new Set(merged.map((reply) => reply.id));
          for (const { reply, version } of localAdds.current.values()) {
            if (version > mutationAtStart && !seen.has(reply.id)) {
              merged.push(reply);
              seen.add(reply.id);
            }
          }
          return merged;
        });
        if (!append) {
          for (const [id, entry] of localAdds.current) {
            if (entry.version <= mutationAtStart) localAdds.current.delete(id);
          }
          for (const [id, version] of localRemovals.current) {
            if (version <= mutationAtStart) localRemovals.current.delete(id);
          }
        }
        setNextCursor(result.nextCursor);
      } catch (cause) {
        if (!isCurrent()) return;
        setError(
          cause instanceof CommunityApiError
            ? cause.message
            : 'Replies could not be loaded.',
        );
      } finally {
        if (isCurrent()) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [authStatus, getIdToken, postId],
  );

  useEffect(() => {
    if (authStatus === 'ready') {
      void load();
    }
  }, [authStatus, load]);

  /** Adds a created reply locally and records it for in-flight refresh reconciliation. */
  const addReply = useCallback(
    (reply: CommunityReply) => {
      invalidatePendingAppends();
      mutationVersion.current += 1;
      localRemovals.current.delete(reply.id);
      localAdds.current.set(reply.id, {
        reply,
        version: mutationVersion.current,
      });
      setReplies((prev) =>
        prev.some((r) => r.id === reply.id) ? prev : [...prev, reply],
      );
    },
    [invalidatePendingAppends],
  );

  /** Removes a deleted reply locally and records it for in-flight refresh reconciliation. */
  const removeReply = useCallback(
    (replyId: string) => {
      invalidatePendingAppends();
      mutationVersion.current += 1;
      localAdds.current.delete(replyId);
      localRemovals.current.set(replyId, mutationVersion.current);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    },
    [invalidatePendingAppends],
  );

  /** Applies updated reaction state to one reply. */
  const updateReplyReactions = useCallback(
    (
      replyId: string,
      reactionCounts: Record<string, number>,
      myReactions: string[],
    ) => {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId ? { ...r, reactionCounts, myReactions } : r,
        ),
      );
    },
    [],
  );

  /** Loads the next reply page when a cursor is available. */
  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    void load({ append: true, cursor: nextCursor });
  }, [load, nextCursor]);

  return {
    replies,
    loading,
    loadingMore,
    hasMore: nextCursor !== null,
    error,
    refresh: () => load(),
    loadMore,
    addReply,
    removeReply,
    updateReplyReactions,
    setReplies,
  };
}
