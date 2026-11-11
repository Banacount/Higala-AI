import type { RiskLevel } from './types.ts';

export const COMMUNITY_CATEGORY_IDS = [
  'relationships',
  'family',
  'academic-pressure',
  'mental-health',
  'personal-struggles',
  'life-experiences',
  'random-thoughts',
  'other',
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORY_IDS)[number];

export interface CommunityCategoryOption {
  id: CommunityCategory;
  label: string;
  shortLabel: string;
}

export const COMMUNITY_CATEGORIES: CommunityCategoryOption[] = [
  { id: 'relationships', label: 'Relationships', shortLabel: 'Relationships' },
  { id: 'family', label: 'Family', shortLabel: 'Family' },
  {
    id: 'academic-pressure',
    label: 'Academic Pressure',
    shortLabel: 'Academics',
  },
  { id: 'mental-health', label: 'Mental Health', shortLabel: 'Mental health' },
  {
    id: 'personal-struggles',
    label: 'Personal Struggles',
    shortLabel: 'Struggles',
  },
  {
    id: 'life-experiences',
    label: 'Life Experiences',
    shortLabel: 'Life',
  },
  { id: 'random-thoughts', label: 'Random Thoughts', shortLabel: 'Random' },
  { id: 'other', label: 'Other', shortLabel: 'Other' },
];

export function isCommunityCategory(
  value: unknown,
): value is CommunityCategory {
  return (
    typeof value === 'string' &&
    COMMUNITY_CATEGORY_IDS.includes(value as CommunityCategory)
  );
}

export function communityCategoryLabel(
  category: CommunityCategory | null,
): string {
  if (!category) return 'Uncategorized';
  return (
    COMMUNITY_CATEGORIES.find((option) => option.id === category)?.label ??
    'Other'
  );
}

export const COMMUNITY_REACTION_IDS = [
  'hear-you',
  'not-alone',
  'sending-support',
  'been-there',
  'thank-you',
] as const;

export type CommunityReaction = (typeof COMMUNITY_REACTION_IDS)[number];

export interface CommunityReactionOption {
  id: CommunityReaction;
  label: string;
}

export const COMMUNITY_REACTIONS: CommunityReactionOption[] = [
  { id: 'hear-you', label: 'I hear you' },
  { id: 'not-alone', label: "You're not alone" },
  { id: 'sending-support', label: 'Sending support' },
  { id: 'been-there', label: "I've been there" },
  { id: 'thank-you', label: 'Thank you for sharing' },
];

export function isCommunityReaction(
  value: unknown,
): value is CommunityReaction {
  return (
    typeof value === 'string' &&
    COMMUNITY_REACTION_IDS.includes(value as CommunityReaction)
  );
}

export function emptyReactionCounts(): Record<CommunityReaction, number> {
  return {
    'hear-you': 0,
    'not-alone': 0,
    'sending-support': 0,
    'been-there': 0,
    'thank-you': 0,
  };
}

export const COMMUNITY_REPORT_REASON_IDS = [
  'harassment',
  'hate-speech',
  'threats-violence',
  'spam',
  'personal-information',
  'harmful-content',
  'other',
] as const;

export type CommunityReportReason =
  (typeof COMMUNITY_REPORT_REASON_IDS)[number];

export interface CommunityReportReasonOption {
  id: CommunityReportReason;
  label: string;
}

export const COMMUNITY_REPORT_REASONS: CommunityReportReasonOption[] = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate-speech', label: 'Hate speech' },
  { id: 'threats-violence', label: 'Threats or violence' },
  { id: 'spam', label: 'Spam' },
  {
    id: 'personal-information',
    label: 'Personal information exposure',
  },
  { id: 'harmful-content', label: 'Harmful or dangerous content' },
  { id: 'other', label: 'Other' },
];

export function isCommunityReportReason(
  value: unknown,
): value is CommunityReportReason {
  return (
    typeof value === 'string' &&
    COMMUNITY_REPORT_REASON_IDS.includes(value as CommunityReportReason)
  );
}

export const COMMUNITY_LIMITS = {
  title: 120,
  content: 5_000,
  replyContent: 2_000,
  reportDescription: 1_000,
  pageSize: 10,
  maxPageSize: 20,
  cursor: 512,
} as const;

export type CommunityPostStatus = 'visible' | 'hidden' | 'deleted';

export type CommunityModerationAction =
  | 'hide'
  | 'restore'
  | 'dismiss-reports';

export const COMMUNITY_MODERATION_ACTIONS: CommunityModerationAction[] = [
  'hide',
  'restore',
  'dismiss-reports',
];

export function isCommunityModerationAction(
  value: unknown,
): value is CommunityModerationAction {
  return (
    typeof value === 'string' &&
    COMMUNITY_MODERATION_ACTIONS.includes(value as CommunityModerationAction)
  );
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: CommunityCategory | null;
  createdAt: number;
  updatedAt: number;
  replyCount: number;
  reactionCounts: Record<CommunityReaction, number>;
  isMine: boolean;
}

export interface CommunityReply {
  id: string;
  postId: string;
  content: string;
  createdAt: number;
  isMine: boolean;
}

export interface CommunityReplyList {
  replies: CommunityReply[];
}

export interface CommunityPostList {
  posts: CommunityPost[];
  nextCursor: string | null;
}

export interface CommunityMe {
  guidelinesAcceptedAt: number | null;
}

export interface CommunityModerationPost {
  id: string;
  title: string;
  content: string;
  category: CommunityCategory | null;
  createdAt: number;
  status: CommunityPostStatus;
  riskLevel: RiskLevel;
  needsReview: boolean;
  reportCount: number;
}

export interface CommunityModerationReport {
  id: string;
  targetType: 'post';
  postId: string;
  targetId: string;
  reason: CommunityReportReason;
  description: string;
  createdAt: number;
  status: 'open' | 'reviewed' | 'dismissed';
}

export interface CommunityModerationQueue {
  posts: CommunityModerationPost[];
  reports: CommunityModerationReport[];
}
