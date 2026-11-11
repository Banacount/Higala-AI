import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CommunityApiError, getCommunityFeed } from '@/lib/communityClient';
import type { CommunityCategory, CommunityPost } from '@/shared/community';

export function useCommunityFeed(category: CommunityCategory | null) {
  const { status: authStatus, getIdToken } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const cursorRef = useRef<string | null>(null);

  const load = useCallback(
    async (mode: 'reset' | 'more') => {
      if (authStatus !== 'ready') return;

      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;

      if (mode === 'reset') {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const token = await getIdToken();
        const page = await getCommunityFeed(
          {
            category: category ?? undefined,
            cursor: mode === 'more' ? cursorRef.current ?? undefined : undefined,
          },
          token,
        );

        if (requestId.current !== currentRequest) return;

        setPosts((previous) =>
          mode === 'reset' ? page.posts : [...previous, ...page.posts],
        );
        cursorRef.current = page.nextCursor;
        setNextCursor(page.nextCursor);
      } catch (cause) {
        if (requestId.current !== currentRequest) return;
        setError(
          cause instanceof CommunityApiError
            ? cause.message
            : 'The community feed could not be loaded.',
        );
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [authStatus, category, getIdToken],
  );

  useEffect(() => {
    if (authStatus === 'ready') {
      void load('reset');
    }
  }, [authStatus, load]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore || loading) return;
    void load('more');
  }, [nextCursor, loadingMore, loading, load]);

  const refresh = useCallback(() => {
    void load('reset');
  }, [load]);

  const removeLocalPost = useCallback((postId: string) => {
    setPosts((previous) => previous.filter((post) => post.id !== postId));
  }, []);

  return {
    posts,
    nextCursor,
    loading,
    loadingMore,
    error,
    authStatus,
    loadMore,
    refresh,
    removeLocalPost,
  };
}
