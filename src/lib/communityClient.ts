import type {
  CommunityMe,
  CommunityModerationAction,
  CommunityModerationQueue,
  CommunityPost,
  CommunityPostList,
  CommunityPostModerationAction,
  CommunityReaction,
  CommunityReply,
  CommunityReplyList,
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
): Promise<{ reply: CommunityReply; supportSuggested?: boolean; pendingReview?: boolean }> {
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

/** Sends a post-reaction toggle request and returns the server's fresh state. */
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

/** Sends a reply-emoji toggle request and returns the server's fresh state. */
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

/** Fetches one page of replies, accepting the legacy array response shape. */
export async function getCommunityReplies(
  postId: string,
  token: string,
  options?: { cursor?: string | null; limit?: number },
  signal?: AbortSignal,
): Promise<CommunityReplyList> {
  const result = await communityGet<
    CommunityReply[] | { replies: CommunityReply[]; nextCursor?: string | null }
  >(
    'replies',
    {
      postId,
      cursor: options?.cursor ?? undefined,
      limit: options?.limit ? String(options.limit) : undefined,
    },
    token,
    signal,
  );
  if (Array.isArray(result)) return { replies: result, nextCursor: null };
  return { replies: result.replies ?? [], nextCursor: result.nextCursor ?? null };
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

/** Records the current user's acceptance of the community guidelines. */
export function acceptGuidelines(
  token: string,
): Promise<{ me: CommunityMe }> {
  return communityPost({ action: 'accept-guidelines' }, token);
}

/** Sends a moderation action for a reply. */
export function moderateReply(
  input: { postId: string; replyId: string; action: CommunityModerationAction },
  token: string,
): Promise<{ ok: true }> {
  return communityPost(
    {
      action: 'moderate-reply',
      postId: input.postId,
      replyId: input.replyId,
      moderationAction: input.action,
    },
    token,
  );
}

/** Sends a moderation action for a post, including warn and delete. */
export function moderatePost(
  input: { postId: string; action: CommunityPostModerationAction },
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

/** Requests erasure of the current user's community content. */
export function deleteMyCommunityData(
  token: string,
): Promise<{ deletedPosts: number; deletedReports: number; deletedReplies?: number }> {
  return communityPost({ action: 'delete-my-data' }, token);
}

/** Fetches the moderator queue, optionally paging flagged replies by cursor. */
export function getModerationQueue(
  token: string,
  options?: { repliesCursor?: string | null; repliesLimit?: number },
  signal?: AbortSignal,
): Promise<CommunityModerationQueue> {
  return communityGet(
    'moderation',
    {
      repliesCursor: options?.repliesCursor ?? undefined,
      repliesLimit: options?.repliesLimit ? String(options.repliesLimit) : undefined,
    },
    token,
    signal,
  );
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
