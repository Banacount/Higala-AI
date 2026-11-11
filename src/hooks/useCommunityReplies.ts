import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CommunityApiError,
  getCommunityReplies,
} from '@/lib/communityClient';
import type { CommunityReply } from '@/shared/community';

const REPLIES_PAGE_SIZE = 20;

export function useCommunityReplies(postId: string | undefined) {
  const { status: authStatus, getIdToken } = useAuth();
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const invalidatePendingLoads = useCallback(() => {
    requestId.current += 1;
    setLoading(false);
    setLoadingMore(false);
  }, []);

  const load = useCallback(
    async (options?: { append?: boolean; cursor?: string | null }) => {
      if (authStatus !== 'ready' || !postId) return;
      const append = options?.append === true;

      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const token = await getIdToken();
        const result = await getCommunityReplies(
          postId,
          token,
          { cursor: append ? options?.cursor ?? null : null, limit: REPLIES_PAGE_SIZE },
        );
        if (requestId.current !== currentRequest) return;
        setReplies((prev) =>
          append
            ? [...prev, ...result.replies.filter((r) => !prev.some((p) => p.id === r.id))]
            : result.replies,
        );
        setNextCursor(result.nextCursor);
      } catch (cause) {
        if (requestId.current !== currentRequest) return;
        setError(
          cause instanceof CommunityApiError
            ? cause.message
            : 'Replies could not be loaded.',
        );
      } finally {
        if (requestId.current === currentRequest) {
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

  const addReply = useCallback(
    (reply: CommunityReply) => {
      invalidatePendingLoads();
      setReplies((prev) =>
        prev.some((r) => r.id === reply.id) ? prev : [...prev, reply],
      );
    },
    [invalidatePendingLoads],
  );

  const removeReply = useCallback(
    (replyId: string) => {
      invalidatePendingLoads();
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    },
    [invalidatePendingLoads],
  );

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
