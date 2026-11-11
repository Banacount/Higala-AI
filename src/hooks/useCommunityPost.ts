import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CommunityApiError,
  getCommunityPost,
} from '@/lib/communityClient';
import type { CommunityPost } from '@/shared/community';

export function useCommunityPost(postId: string | undefined) {
  const { status: authStatus, getIdToken } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (authStatus !== 'ready' || !postId) return;

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const token = await getIdToken();
      const result = await getCommunityPost(postId, token);
      if (requestId.current !== currentRequest) return;
      setPost(result);
    } catch (cause) {
      if (requestId.current !== currentRequest) return;
      if (cause instanceof CommunityApiError && cause.status === 404) {
        setNotFound(true);
        setPost(null);
      } else {
        setError(
          cause instanceof CommunityApiError
            ? cause.message
            : 'This post could not be loaded.',
        );
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [authStatus, getIdToken, postId]);

  useEffect(() => {
    if (authStatus === 'ready') {
      void load();
    }
  }, [authStatus, load]);

  return {
    post,
    loading,
    error,
    notFound,
    authStatus,
    refresh: load,
    setPost,
  };
}
