import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CommunityApiError,
  getCommunityReplies,
} from '@/lib/communityClient';
import type { CommunityReply } from '@/shared/community';

export function useCommunityReplies(postId: string | undefined) {
  const { status: authStatus, getIdToken } = useAuth();
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (authStatus !== 'ready' || !postId) return;

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      const result = await getCommunityReplies(postId, token);
      if (requestId.current !== currentRequest) return;
      setReplies(result);
    } catch (cause) {
      if (requestId.current !== currentRequest) return;
      setError(
        cause instanceof CommunityApiError
          ? cause.message
          : 'Replies could not be loaded.',
      );
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [authStatus, getIdToken, postId]);

  useEffect(() => {
    if (authStatus === 'ready') {
      void load();
    }
  }, [authStatus, load]);

  const addReply = useCallback((reply: CommunityReply) => {
    setReplies((prev) => [...prev, reply]);
  }, []);

  const removeReply = useCallback((replyId: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  }, []);

  const updateReplyReactions = useCallback(
    (
      replyId: string,
      reactionCounts: Record<string, number>,
      myReactions: string[],
    ) => {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId
            ? { ...r, reactionCounts, myReactions }
            : r,
        ),
      );
    },
    [],
  );

  return {
    replies,
    loading,
    error,
    refresh: load,
    addReply,
    removeReply,
    updateReplyReactions,
    setReplies,
  };
}
