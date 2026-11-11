import type {
  CommunityMe,
  CommunityModerationAction,
  CommunityModerationQueue,
  CommunityPost,
  CommunityPostList,
  CommunityReaction,
  CommunityReply,
  CommunityReportReason,
  ReplyEmoji,
} from '@/shared/community';

export class CommunityApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'community_error') {
    super(message);
    this.name = 'CommunityApiError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  error?: unknown;
  code?: unknown;
}

async function readError(response: Response): Promise<CommunityApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Ignore non-JSON error bodies.
  }
  return new CommunityApiError(
    typeof body.error === 'string'
      ? body.error
      : `Request failed (${response.status}).`,
    response.status,
    typeof body.code === 'string' ? body.code : 'community_error',
  );
}

export async function communityGet<T>(
  resource: string,
  params: Record<string, string | undefined>,
  token: string,
  signal?: AbortSignal,
): Promise<T> {
  const search = new URLSearchParams({ resource });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const response = await fetch(`/api/community?${search.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) throw await readError(response);

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new CommunityApiError(
      'The community service is not available right now.',
      503,
      'not_json',
    );
  }

  return (await response.json()) as T;
}

export async function communityPost<T>(
  payload: Record<string, unknown>,
  token: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch('/api/community', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) throw await readError(response);

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new CommunityApiError(
      'The community service is not available right now.',
      503,
      'not_json',
    );
  }

  return (await response.json()) as T;
}

export function createPost(
  input: {
    title: string;
    content: string;
    category: string | null;
  },
  token: string,
): Promise<{ post: CommunityPost; supportSuggested: boolean }> {
  return communityPost(
    {
      action: 'create-post',
      title: input.title,
      content: input.content,
      category: input.category,
    },
    token,
  );
}

export function deletePost(postId: string, token: string): Promise<{ ok: true }> {
  return communityPost({ action: 'delete-post', postId }, token);
}

export function createReply(
  input: {
    postId: string;
    content: string;
  },
  token: string,
): Promise<{ reply: CommunityReply; supportSuggested?: boolean }> {
  return communityPost(
    {
      action: 'create-reply',
      postId: input.postId,
      content: input.content,
    },
    token,
  );
}

export function deleteReply(
  replyId: string,
  token: string,
): Promise<{ ok: true }> {
  return communityPost({ action: 'delete-reply', replyId }, token);
}

export function toggleReaction(
  input: {
    postId: string;
    reaction: CommunityReaction;
  },
  token: string,
): Promise<{
  ok: boolean;
  reacted: boolean;
  reaction: CommunityReaction;
  reactionCounts: Record<CommunityReaction, number>;
  myReactions: CommunityReaction[];
}> {
  return communityPost(
    {
      action: 'toggle-reaction',
      postId: input.postId,
      reaction: input.reaction,
    },
    token,
  );
}

export function toggleReplyReaction(
  input: {
    postId: string;
    replyId: string;
    emoji: ReplyEmoji;
  },
  token: string,
): Promise<{
  ok: boolean;
  reacted: boolean;
  emoji: ReplyEmoji;
  reactionCounts: Record<string, number>;
  myReactions: string[];
}> {
  return communityPost(
    {
      action: 'toggle-reply-reaction',
      postId: input.postId,
      replyId: input.replyId,
      emoji: input.emoji,
    },
    token,
  );
}

export async function getCommunityReplies(
  postId: string,
  token: string,
  signal?: AbortSignal,
): Promise<CommunityReply[]> {
  const result = await communityGet<
    CommunityReply[] | { replies: CommunityReply[] }
  >('replies', { postId }, token, signal);
  if (Array.isArray(result)) return result;
  return result.replies ?? [];
}

export function reportPost(
  input: {
    postId: string;
    reason: CommunityReportReason;
    description: string;
  },
  token: string,
): Promise<{ ok: true }> {
  return communityPost(
    {
      action: 'report-post',
      postId: input.postId,
      reason: input.reason,
      description: input.description,
    },
    token,
  );
}

export function acceptGuidelines(
  token: string,
): Promise<{ me: CommunityMe }> {
  return communityPost({ action: 'accept-guidelines' }, token);
}

export function moderatePost(
  input: { postId: string; action: CommunityModerationAction },
  token: string,
): Promise<{ ok: true }> {
  return communityPost(
    {
      action: 'moderate-post',
      postId: input.postId,
      moderationAction: input.action,
    },
    token,
  );
}

export function deleteMyCommunityData(
  token: string,
): Promise<{ deletedPosts: number; deletedReports: number; deletedReplies?: number }> {
  return communityPost({ action: 'delete-my-data' }, token);
}

export function getModerationQueue(
  token: string,
  signal?: AbortSignal,
): Promise<CommunityModerationQueue> {
  return communityGet('moderation', {}, token, signal);
}

export function getMyCommunityState(
  token: string,
  signal?: AbortSignal,
): Promise<CommunityMe> {
  return communityGet('me', {}, token, signal);
}

export function getCommunityPost(
  postId: string,
  token: string,
  signal?: AbortSignal,
): Promise<CommunityPost> {
  return communityGet('post', { id: postId }, token, signal);
}

export function getCommunityFeed(
  input: { category?: string; cursor?: string; limit?: number },
  token: string,
  signal?: AbortSignal,
): Promise<CommunityPostList> {
  return communityGet(
    'posts',
    {
      category: input.category,
      cursor: input.cursor,
      limit: input.limit ? String(input.limit) : undefined,
    },
    token,
    signal,
  );
}
