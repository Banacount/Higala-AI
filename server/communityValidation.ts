import {
  COMMUNITY_LIMITS,
  isCommunityCategory,
  isCommunityModerationAction,
  isCommunityPostModerationAction,
  isCommunityReaction,
  isCommunityReportReason,
  isReplyEmoji,
  type CommunityCategory,
  type CommunityModerationAction,
  type CommunityPostModerationAction,
  type CommunityReaction,
  type CommunityReportReason,
  type ReplyEmoji,
} from '../src/shared/community.ts';
import { CommunityError } from './communityErrors.ts';

export interface CreatePostInput {
  title: string;
  content: string;
  category: CommunityCategory | null;
}

export interface CreateReplyInput {
  postId: string;
  content: string;
}

export interface EditPostInput {
  postId: string;
  title: string;
  content: string;
  category: CommunityCategory | null;
}

export interface EditReplyInput {
  replyId: string;
  content: string;
}

export interface ToggleReactionInput {
  postId: string;
  reaction: CommunityReaction;
}

export interface ToggleReplyReactionInput {
  postId: string;
  replyId: string;
  emoji: ReplyEmoji;
}

export interface ReportPostInput {
  postId: string;
  reason: CommunityReportReason;
  description: string;
}

export interface ReportReplyInput {
  postId: string;
  replyId: string;
  reason: CommunityReportReason;
  description: string;
}

export interface ModerateReplyInput {
  postId: string;
  replyId: string;
  action: CommunityModerationAction;
}

export interface ModeratePostInput {
  postId: string;
  action: CommunityPostModerationAction;
}

const POST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CommunityError('The request body is invalid.');
  }
  return value as Record<string, unknown>;
}

function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function optionalText(
  value: unknown,
  maxLength: number,
  label: string,
): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new CommunityError(`${label} must be text.`);
  }
  const cleaned = cleanText(value);
  if (cleaned.length > maxLength) {
    throw new CommunityError(
      `${label} is too long (max ${maxLength.toLocaleString()} characters).`,
    );
  }
  return cleaned;
}

export function parseCreatePost(body: unknown): CreatePostInput {
  const record = asRecord(body);
  const title = optionalText(record.title, COMMUNITY_LIMITS.title, 'Title');
  const content = optionalText(
    record.content,
    COMMUNITY_LIMITS.content,
    'Your post',
  );

  if (!content) {
    throw new CommunityError('Write something before posting.');
  }

  let category: CommunityCategory | null = null;
  if (record.category !== undefined && record.category !== null && record.category !== '') {
    if (!isCommunityCategory(record.category)) {
      throw new CommunityError('Choose a valid category.');
    }
    category = record.category;
  }

  return { title, content, category };
}

export function parseCreateReply(body: unknown): CreateReplyInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  const content = optionalText(
    record.content,
    COMMUNITY_LIMITS.replyContent,
    'Your reply',
  );

  if (!content) {
    throw new CommunityError('Write something before replying.');
  }

  return { postId, content };
}

export function parseEditPost(body: unknown): EditPostInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  const title = optionalText(record.title, COMMUNITY_LIMITS.title, 'Title');
  const content = optionalText(
    record.content,
    COMMUNITY_LIMITS.content,
    'Your post',
  );

  if (!content) {
    throw new CommunityError('Write something before posting.');
  }

  let category: CommunityCategory | null = null;
  if (record.category !== undefined && record.category !== null && record.category !== '') {
    if (!isCommunityCategory(record.category)) {
      throw new CommunityError('Choose a valid category.');
    }
    category = record.category;
  }

  return { postId, title, content, category };
}

export function parseEditReply(body: unknown): EditReplyInput {
  const record = asRecord(body);
  const replyId = parseReplyId(record.replyId ?? record.id);
  const content = optionalText(
    record.content,
    COMMUNITY_LIMITS.replyContent,
    'Your reply',
  );

  if (!content) {
    throw new CommunityError('Write something before replying.');
  }

  return { replyId, content };
}

/** Parses and validates a request to toggle a post reaction. */
export function parseToggleReaction(body: unknown): ToggleReactionInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  if (!isCommunityReaction(record.reaction)) {
    throw new CommunityError('Choose a valid supportive reaction.');
  }
  return { postId, reaction: record.reaction };
}

/** Parses and validates a request to toggle a reply emoji reaction. */
export function parseToggleReplyReaction(body: unknown): ToggleReplyReactionInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  const replyId = parseReplyId(record.replyId);
  if (!isReplyEmoji(record.emoji)) {
    throw new CommunityError('Choose a valid supportive emoji reaction.');
  }
  return { postId, replyId, emoji: record.emoji };
}

export function parsePostId(value: unknown, label = 'Post'): string {
  if (typeof value !== 'string' || !POST_ID_PATTERN.test(value)) {
    throw new CommunityError(`${label} is invalid.`);
  }
  return value;
}

export function parseReplyId(value: unknown, label = 'Reply'): string {
  if (typeof value !== 'string' || !POST_ID_PATTERN.test(value)) {
    throw new CommunityError(`${label} is invalid.`);
  }
  return value;
}

/** Parses and validates a request to report a post. */
export function parseReportPost(body: unknown): ReportPostInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  if (!isCommunityReportReason(record.reason)) {
    throw new CommunityError('Choose a valid report reason.');
  }
  const description = optionalText(
    record.description,
    COMMUNITY_LIMITS.reportDescription,
    'Details',
  );
  return { postId, reason: record.reason, description };
}

export function parseReportReply(body: unknown): ReportReplyInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  const replyId = parseReplyId(record.replyId);
  if (!isCommunityReportReason(record.reason)) {
    throw new CommunityError('Choose a valid report reason.');
  }
  const description = optionalText(
    record.description,
    COMMUNITY_LIMITS.reportDescription,
    'Details',
  );
  return { postId, replyId, reason: record.reason, description };
}

/** Parses and validates a moderation action for a reply. */
export function parseModerateReply(body: unknown): ModerateReplyInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  const replyId = parseReplyId(record.replyId);
  if (!isCommunityModerationAction(record.moderationAction)) {
    throw new CommunityError('Choose a valid moderation action.');
  }
  return { postId, replyId, action: record.moderationAction };
}

/** Parses and validates a moderation action for a post, including warn/delete. */
export function parseModeratePost(body: unknown): ModeratePostInput {
  const record = asRecord(body);
  const postId = parsePostId(record.postId);
  if (!isCommunityPostModerationAction(record.moderationAction)) {
    throw new CommunityError('Choose a valid moderation action.');
  }
  return { postId, action: record.moderationAction };
}

/** Parses feed filters and caps the requested page size. */
export function parseFeedQuery(params: URLSearchParams): {
  category: CommunityCategory | null;
  cursor: string | null;
  limit: number;
} {
  const rawCategory = params.get('category');
  let category: CommunityCategory | null = null;
  if (rawCategory && rawCategory !== 'all') {
    if (!isCommunityCategory(rawCategory)) {
      throw new CommunityError('That category does not exist.');
    }
    category = rawCategory;
  }

  const rawLimit = params.get('limit');
  let limit: number = COMMUNITY_LIMITS.pageSize;
  if (rawLimit) {
    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new CommunityError('The page size is invalid.');
    }
    limit = Math.min(
      Math.floor(parsed),
      COMMUNITY_LIMITS.maxPageSize,
    );
  }

  const cursor = params.get('cursor');
  if (cursor && cursor.length > COMMUNITY_LIMITS.cursor) {
    throw new CommunityError('The page cursor is invalid.');
  }

  return { category, cursor: cursor || null, limit };
}

/** Parses reply pagination options and caps the requested page size. */
export function parseRepliesQuery(params: URLSearchParams): {
  cursor: string | null;
  limit: number;
} {
  const rawLimit = params.get('limit');
  let limit: number = COMMUNITY_LIMITS.pageSize;
  if (rawLimit) {
    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new CommunityError('The page size is invalid.');
    }
    limit = Math.min(Math.floor(parsed), COMMUNITY_LIMITS.maxPageSize);
  }

  const cursor = params.get('cursor');
  if (cursor && cursor.length > COMMUNITY_LIMITS.cursor) {
    throw new CommunityError('The page cursor is invalid.');
  }

  return { cursor: cursor || null, limit };
}

/** Parses moderation-queue pagination options for flagged replies. */
export function parseModerationQueueQuery(params: URLSearchParams): {
  repliesCursor: string | null;
  repliesLimit: number;
} {
  const rawLimit = params.get('repliesLimit') ?? params.get('limit');
  let repliesLimit = 30;
  if (rawLimit) {
    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new CommunityError('The page size is invalid.');
    }
    repliesLimit = Math.min(Math.floor(parsed), COMMUNITY_LIMITS.maxPageSize);
  }

  const cursor = params.get('repliesCursor') ?? params.get('cursor');
  if (cursor && cursor.length > COMMUNITY_LIMITS.cursor) {
    throw new CommunityError('The page cursor is invalid.');
  }

  return { repliesCursor: cursor || null, repliesLimit };
}

export function parseAction(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    throw new CommunityError('Choose an action.');
  }
  return value;
}

export function parseResource(value: string | null): string {
  const allowed = new Set(['posts', 'post', 'replies', 'me', 'moderation']);
  if (!value) return 'posts';
  if (!allowed.has(value)) {
    throw new CommunityError('That community resource does not exist.', 404);
  }
  return value;
}
