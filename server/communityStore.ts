import {
  FieldPath,
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {
  COMMUNITY_REACTION_IDS,
  REPLY_EMOJI_IDS,
  emptyReactionCounts,
  isCommunityCategory,
  isCommunityReaction,
  isReplyEmoji,
  type CommunityCategory,
  type CommunityMe,
  type CommunityModerationPost,
  type CommunityModerationReply,
  type CommunityModerationQueue,
  type CommunityModerationReport,
  type CommunityPost,
  type CommunityPostList,
  type CommunityPostStatus,
  type CommunityReaction,
  type CommunityReply,
  type CommunityReportReason,
  type ReplyEmoji,
} from '../src/shared/community.ts';
import { isRiskLevel, type RiskLevel } from '../src/shared/types.ts';
import {
  CommunityConflictError,
  CommunityError,
  CommunityNotFoundError,
  CommunityRateLimitError,
} from './communityErrors.ts';
import { getCommunityFirestore } from './firebaseAdmin.ts';
import type {
  CreatePostInput,
  CreateReplyInput,
  ReportPostInput,
} from './communityValidation.ts';

const POSTS = 'communityPosts';
const REPORTS = 'communityReports';
const MEMBERS = 'communityMembers';
const REPLIES = 'communityReplies';
const REACTIONS = 'communityReactions';
const REPLY_REACTIONS = 'communityReplyReactions';
const DELETION_POST_TARGETS = 'deletionPostTargets';

const POST_WINDOW_MS = 10 * 60_000;
const POST_WINDOW_MAX = 6;
const REPLY_WINDOW_MS = 10 * 60_000;
const REPLY_WINDOW_MAX = 15;
const REPORT_WINDOW_MS = 60 * 60_000;
const REPORT_WINDOW_MAX = 10;

interface CommunityPostDoc {
  authorId?: unknown;
  title?: unknown;
  content?: unknown;
  category?: unknown;
  status?: unknown;
  riskLevel?: unknown;
  needsReview?: unknown;
  reportCount?: unknown;
  replyCount?: unknown;
  reactionCounts?: unknown;
  cleanupPending?: unknown;
  cleanupCompletedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface CommunityReplyDoc {
  authorId?: unknown;
  postId?: unknown;
  content?: unknown;
  status?: unknown;
  riskLevel?: unknown;
  needsReview?: unknown;
  reactionCounts?: unknown;
  deletionCountAdjusted?: unknown;
  deletionCountAdjustedAt?: unknown;
  reactionCleanupPending?: unknown;
  reactionCleanupCompletedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface CommunityReactionDoc {
  postId?: unknown;
  userId?: unknown;
  reactionType?: unknown;
  deletionCountAdjusted?: unknown;
  deletionCountAdjustedAt?: unknown;
  createdAt?: unknown;
}

interface CommunityReplyReactionDoc {
  replyId?: unknown;
  postId?: unknown;
  userId?: unknown;
  emoji?: unknown;
  deletionCountAdjusted?: unknown;
  deletionCountAdjustedAt?: unknown;
  createdAt?: unknown;
}

interface CommunityReportDoc {
  reporterId?: unknown;
  targetType?: unknown;
  postId?: unknown;
  targetId?: unknown;
  reason?: unknown;
  description?: unknown;
  status?: unknown;
  createdAt?: unknown;
  reviewedAt?: unknown;
}

function timestampMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readReactionCounts(
  value: unknown,
): Record<CommunityReaction, number> {
  const counts = emptyReactionCounts();
  if (!value || typeof value !== 'object') return counts;
  const record = value as Record<string, unknown>;
  for (const reaction of COMMUNITY_REACTION_IDS) {
    counts[reaction] = readNumber(record[reaction]);
  }
  return counts;
}

function readReplyReactionCounts(
  value: unknown,
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!value || typeof value !== 'object') return counts;
  const record = value as Record<string, unknown>;
  for (const emoji of REPLY_EMOJI_IDS) {
    const num = readNumber(record[emoji]);
    if (num > 0) {
      counts[emoji] = num;
    }
  }
  return counts;
}

function readCategory(value: unknown): CommunityCategory | null {
  return isCommunityCategory(value) ? value : null;
}

function readStatus(value: unknown): CommunityPostStatus {
  return value === 'hidden' || value === 'deleted' ? value : 'visible';
}

function toPublicPost(
  id: string,
  data: CommunityPostDoc,
  uid: string,
  myReactions: CommunityReaction[] = [],
): CommunityPost {
  return {
    id,
    title: readString(data.title),
    content: readString(data.content),
    category: readCategory(data.category),
    createdAt: timestampMillis(data.createdAt),
    updatedAt: timestampMillis(data.updatedAt),
    replyCount: readNumber(data.replyCount),
    reactionCounts: readReactionCounts(data.reactionCounts),
    myReactions,
    isMine: data.authorId === uid,
  };
}

function toPublicReply(
  id: string,
  data: CommunityReplyDoc,
  uid: string,
  myReactions: string[] = [],
): CommunityReply {
  return {
    id,
    postId: readString(data.postId),
    content: readString(data.content),
    createdAt: timestampMillis(data.createdAt),
    isMine: data.authorId === uid,
    reactionCounts: readReplyReactionCounts(data.reactionCounts),
    myReactions,
  };
}

function toModerationPost(
  id: string,
  data: CommunityPostDoc,
): CommunityModerationPost {
  return {
    id,
    title: readString(data.title),
    content: readString(data.content),
    category: readCategory(data.category),
    createdAt: timestampMillis(data.createdAt),
    status: readStatus(data.status),
    riskLevel: isRiskLevel(data.riskLevel) ? data.riskLevel : 'none',
    needsReview: data.needsReview === true,
    reportCount: readNumber(data.reportCount),
  };
}

function toModerationReply(
  id: string,
  data: CommunityReplyDoc,
): CommunityModerationReply {
  return {
    id,
    postId: readString(data.postId),
    content: readString(data.content),
    createdAt: timestampMillis(data.createdAt),
    status: readStatus(data.status),
    riskLevel: isRiskLevel(data.riskLevel) ? data.riskLevel : 'none',
    needsReview: data.needsReview === true,
  };
}

function toModerationReport(
  id: string,
  data: CommunityReportDoc,
): CommunityModerationReport {
  const status =
    data.status === 'reviewed' || data.status === 'dismissed'
      ? data.status
      : 'open';
  return {
    id,
    targetType: 'post',
    postId: readString(data.postId),
    targetId: readString(data.targetId),
    reason: data.reason as CommunityReportReason,
    description: readString(data.description),
    createdAt: timestampMillis(data.createdAt),
    status,
  };
}

function encodeCursor(createdAt: number, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt, id }), 'utf8').toString(
    'base64url',
  );
}

function decodeCursor(
  cursor: string | null,
): { t: number; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as { t?: unknown; id?: unknown };
    if (
      typeof parsed.t !== 'number' ||
      !Number.isFinite(parsed.t) ||
      typeof parsed.id !== 'string' ||
      !parsed.id
    ) {
      return null;
    }
    return { t: parsed.t, id: parsed.id };
  } catch {
    return null;
  }
}

function assertPostDataReadableForReplies(
  data: CommunityPostDoc | undefined,
  uid: string,
  isAdmin: boolean,
): void {
  if (!data) {
    throw new CommunityNotFoundError();
  }

  const status = readStatus(data.status);
  if (status === 'deleted') {
    throw new CommunityNotFoundError();
  }
  if (status === 'hidden' && !isAdmin && data.authorId !== uid) {
    // Do not reveal hidden content to non-owners.
    throw new CommunityNotFoundError();
  }
}

async function assertPostReadableForReplies(
  uid: string,
  postId: string,
  isAdmin: boolean,
): Promise<void> {
  const db = getCommunityFirestore();
  const snapshot = await db.collection(POSTS).doc(postId).get();
  assertPostDataReadableForReplies(
    snapshot.exists ? (snapshot.data() as CommunityPostDoc) : undefined,
    uid,
    isAdmin,
  );
}

function assertMemberNotDeleting(member: Record<string, unknown>): void {
  if (member.deletionState === 'deleting') {
    throw new CommunityError(
      'Your community data is being deleted, so new content cannot be created right now.',
      409,
      'account_deleting',
    );
  }
}

async function assertMemberCanParticipate(
  member: Record<string, unknown>,
): Promise<void> {
  if (timestampMillis(member.guidelinesAcceptedAt) <= 0) {
    throw new CommunityError(
      'Please read and accept the community guidelines before participating.',
      403,
      'guidelines_required',
    );
  }
  assertMemberNotDeleting(member);
}

async function enforceRateLimit(
  db: Firestore,
  uid: string,
  kind: 'post' | 'report',
): Promise<void> {
  const memberRef = db.collection(MEMBERS).doc(uid);
  const windowMs = kind === 'post' ? POST_WINDOW_MS : REPORT_WINDOW_MS;
  const max = kind === 'post' ? POST_WINDOW_MAX : REPORT_WINDOW_MAX;
  const startKey = kind === 'post' ? 'postWindowStart' : 'reportWindowStart';
  const countKey = kind === 'post' ? 'postWindowCount' : 'reportWindowCount';
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(memberRef);
    const data = snapshot.data() ?? {};
    if (data.deletionState === 'deleting') {
      throw new CommunityError(
        'Your community data is being deleted, so new content cannot be created right now.',
        409,
        'account_deleting',
      );
    }
    const start = timestampMillis(data[startKey]);
    const count = readNumber(data[countKey]);

    let nextStart = now;
    let nextCount = 1;

    if (start > 0 && now - start < windowMs) {
      if (count >= max) {
        throw new CommunityRateLimitError(
          kind === 'post'
            ? 'You are sharing very quickly. Take a breath and try again in a few minutes.'
            : 'You have sent several reports recently. Please wait before sending another.',
        );
      }
      nextStart = start;
      nextCount = count + 1;
    }

    transaction.set(
      memberRef,
      {
        [startKey]: Timestamp.fromMillis(nextStart),
        [countKey]: nextCount,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  });
}

export async function getMember(uid: string): Promise<CommunityMe> {
  const db = getCommunityFirestore();
  const snapshot = await db.collection(MEMBERS).doc(uid).get();
  const acceptedAt = timestampMillis(
    snapshot.data()?.guidelinesAcceptedAt,
  );
  return { guidelinesAcceptedAt: acceptedAt > 0 ? acceptedAt : null };
}

export async function acceptGuidelines(uid: string): Promise<CommunityMe> {
  const db = getCommunityFirestore();
  const now = Timestamp.now();
  await db
    .collection(MEMBERS)
    .doc(uid)
    .set(
      {
        guidelinesAcceptedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  return { guidelinesAcceptedAt: now.toMillis() };
}

export async function createPost(
  uid: string,
  input: CreatePostInput,
  moderation: {
    riskLevel: RiskLevel;
    needsReview: boolean;
  },
): Promise<CommunityPost> {
  const db = getCommunityFirestore();
  const memberRef = db.collection(MEMBERS).doc(uid);
  const ref = db.collection(POSTS).doc();
  const now = Timestamp.now();
  const reactionCounts = emptyReactionCounts();
  const data: CommunityPostDoc = {
    authorId: uid,
    title: input.title,
    content: input.content,
    category: input.category,
    status: 'visible',
    riskLevel: moderation.riskLevel,
    needsReview: moderation.needsReview,
    reportCount: 0,
    replyCount: 0,
    reactionCounts,
    createdAt: now,
    updatedAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const memberSnapshot = await transaction.get(memberRef);
    const member = memberSnapshot.data() ?? {};

    await assertMemberCanParticipate(member);

    const windowStart = timestampMillis(member.postWindowStart);
    const windowCount = readNumber(member.postWindowCount);
    const nowMillis = now.toMillis();
    let nextStart = nowMillis;
    let nextCount = 1;

    if (windowStart > 0 && nowMillis - windowStart < POST_WINDOW_MS) {
      if (windowCount >= POST_WINDOW_MAX) {
        throw new CommunityRateLimitError(
          'You are sharing very quickly. Take a breath and try again in a few minutes.',
        );
      }
      nextStart = windowStart;
      nextCount = windowCount + 1;
    }

    transaction.set(
      memberRef,
      {
        postWindowStart: Timestamp.fromMillis(nextStart),
        postWindowCount: nextCount,
        updatedAt: now,
      },
      { merge: true },
    );
    transaction.create(ref, data);
  });

  return {
    id: ref.id,
    title: input.title,
    content: input.content,
    category: input.category,
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
    replyCount: 0,
    reactionCounts,
    myReactions: [],
    isMine: true,
  };
}

export async function createReply(
  uid: string,
  input: CreateReplyInput,
  moderation: {
    riskLevel: RiskLevel;
    needsReview: boolean;
  },
): Promise<CommunityReply> {
  const db = getCommunityFirestore();
  const memberRef = db.collection(MEMBERS).doc(uid);
  const postRef = db.collection(POSTS).doc(input.postId);
  const replyRef = db.collection(REPLIES).doc();
  const now = Timestamp.now();

  const data: CommunityReplyDoc = {
    authorId: uid,
    postId: input.postId,
    content: input.content,
    status: moderation.needsReview ? 'hidden' : 'visible',
    riskLevel: moderation.riskLevel,
    needsReview: moderation.needsReview,
    reactionCounts: {},
    createdAt: now,
    updatedAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const memberSnapshot = await transaction.get(memberRef);
    const member = memberSnapshot.data() ?? {};

    await assertMemberCanParticipate(member);

    const postSnapshot = await transaction.get(postRef);
    if (!postSnapshot.exists) {
      throw new CommunityNotFoundError('This post does not exist.');
    }
    const post = postSnapshot.data() as CommunityPostDoc;
    if (readStatus(post.status) !== 'visible') {
      throw new CommunityNotFoundError('This post is no longer available.');
    }

    const windowStart = timestampMillis(member.replyWindowStart);
    const windowCount = readNumber(member.replyWindowCount);
    const nowMillis = now.toMillis();
    let nextStart = nowMillis;
    let nextCount = 1;

    if (windowStart > 0 && nowMillis - windowStart < REPLY_WINDOW_MS) {
      if (windowCount >= REPLY_WINDOW_MAX) {
        throw new CommunityRateLimitError(
          'You are replying very quickly. Take a breath and try again in a few minutes.',
        );
      }
      nextStart = windowStart;
      nextCount = windowCount + 1;
    }

    transaction.set(
      memberRef,
      {
        replyWindowStart: Timestamp.fromMillis(nextStart),
        replyWindowCount: nextCount,
        updatedAt: now,
      },
      { merge: true },
    );

    if (!moderation.needsReview) {
      transaction.update(postRef, {
        replyCount: FieldValue.increment(1),
        updatedAt: now,
      });
    }

    transaction.create(replyRef, data);
  });

  return {
    id: replyRef.id,
    postId: input.postId,
    content: input.content,
    createdAt: now.toMillis(),
    reactionCounts: {},
    myReactions: [],
    isMine: true,
  };
}

export async function listReplies(
  uid: string,
  postId: string,
  isAdmin = false,
  options?: { cursor?: string | null; limit?: number },
): Promise<{ replies: CommunityReply[]; nextCursor: string | null }> {
  await assertPostReadableForReplies(uid, postId, isAdmin);

  const db = getCommunityFirestore();
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 50));
  let query = db
    .collection(REPLIES)
    .where('postId', '==', postId)
    .where('status', '==', 'visible')
    .orderBy('createdAt', 'asc')
    .orderBy(FieldPath.documentId(), 'asc')
    .limit(limit + 1);

  const decoded = decodeCursor(options?.cursor ?? null);
  if (decoded) {
    const cursorDoc = await db.collection(REPLIES).doc(decoded.id).get();
    if (
      cursorDoc.exists &&
      readString((cursorDoc.data() as CommunityReplyDoc).postId) === postId &&
      readStatus((cursorDoc.data() as CommunityReplyDoc).status) === 'visible'
    ) {
      query = query.startAfter(cursorDoc);
    }
    // Unknown/foreign cursors are ignored to avoid leaking or throwing on stale pages.
  }

  const repliesSnapshot = await query.get();
  const docs = repliesSnapshot.docs.slice(0, limit);
  const visibleReplies = docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as CommunityReplyDoc,
  }));

  const replyIds = visibleReplies.map(({ id }) => id);
  const userReactionsByReplyId = new Map<string, string[]>();
  if (replyIds.length > 0) {
    for (let index = 0; index < replyIds.length; index += 30) {
      const chunk = replyIds.slice(index, index + 30);
      const userReactionsSnapshot = await db
        .collection(REPLY_REACTIONS)
        .where('postId', '==', postId)
        .where('userId', '==', uid)
        .where('replyId', 'in', chunk)
        .get();

      for (const doc of userReactionsSnapshot.docs) {
        const data = doc.data() as CommunityReplyReactionDoc;
        const replyId = readString(data.replyId);
        const emoji = readString(data.emoji);
        if (replyId && isReplyEmoji(emoji)) {
          const list = userReactionsByReplyId.get(replyId) ?? [];
          list.push(emoji);
          userReactionsByReplyId.set(replyId, list);
        }
      }
    }
  }

  const nextCursor =
    repliesSnapshot.docs.length > limit && visibleReplies.length > 0
      ? encodeCursor(
          timestampMillis(
            visibleReplies[visibleReplies.length - 1].data.createdAt,
          ),
          visibleReplies[visibleReplies.length - 1].id,
        )
      : null;

  return {
    replies: visibleReplies.map(({ id, data }) =>
      toPublicReply(id, data, uid, userReactionsByReplyId.get(id) ?? []),
    ),
    nextCursor,
  };
}

async function deleteReplyReactionsForReply(
  db: Firestore,
  replyId: string,
): Promise<void> {
  for (;;) {
    const snapshot = await db
      .collection(REPLY_REACTIONS)
      .where('replyId', '==', replyId)
      .limit(100)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    if (snapshot.size < 100) break;
  }
}

export async function deleteReply(uid: string, replyId: string): Promise<void> {
  const db = getCommunityFirestore();
  const replyRef = db.collection(REPLIES).doc(replyId);

  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(replyRef);
    if (!snapshot.exists) {
      throw new CommunityNotFoundError();
    }
    const data = snapshot.data() as CommunityReplyDoc;
    if (data.authorId !== uid) {
      // Do not reveal whether someone else's reply exists.
      throw new CommunityNotFoundError();
    }
    const status = readStatus(data.status);
    if (status === 'deleted' && data.reactionCleanupPending !== true) {
      throw new CommunityNotFoundError();
    }

    if (status !== 'deleted') {
      const postId = readString(data.postId);
      const postRef = db.collection(POSTS).doc(postId);
      const postSnapshot = await transaction.get(postRef);

      const wasPublic = status === 'visible' && data.needsReview !== true;

      transaction.update(replyRef, {
        status: 'deleted',
        content: '',
        needsReview: false,
        reactionCounts: {},
        reactionCleanupPending: true,
        updatedAt: Timestamp.now(),
      });

      if (wasPublic && postSnapshot.exists) {
        transaction.update(postRef, {
          replyCount: FieldValue.increment(-1),
          updatedAt: Timestamp.now(),
        });
      }
    }

    return { cleanup: true as const };
  });

  if (result.cleanup) {
    await deleteReplyReactionsForReply(db, replyId);
    await replyRef
      .set(
        {
          reactionCleanupPending: false,
          reactionCleanupCompletedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      )
      .catch(() => {
        // Reply may have been physically removed; cleanup is done.
      });
  }
}

export async function toggleReplyReaction(
  uid: string,
  postId: string,
  replyId: string,
  emoji: ReplyEmoji,
  isAdmin = false,
): Promise<{
  ok: boolean;
  reacted: boolean;
  emoji: ReplyEmoji;
  reactionCounts: Record<string, number>;
  myReactions: string[];
}> {
  const db = getCommunityFirestore();
  const memberRef = db.collection(MEMBERS).doc(uid);
  const postRef = db.collection(POSTS).doc(postId);
  const replyRef = db.collection(REPLIES).doc(replyId);
  const reactionRef = db
    .collection(REPLY_REACTIONS)
    .doc(`${replyId}_${uid}_${encodeURIComponent(emoji)}`);

  let reacted = false;
  let nextReactionCounts: Record<string, number> = {};

  await db.runTransaction(async (transaction) => {
    const memberSnapshot = await transaction.get(memberRef);
    const member = memberSnapshot.data() ?? {};
    // Reactions do not require guidelines acceptance, but they must respect
    // the transactional account-deletion fence.
    assertMemberNotDeleting(member);

    const replySnapshot = await transaction.get(replyRef);
    if (!replySnapshot.exists) {
      throw new CommunityNotFoundError('This reply does not exist.');
    }
    const replyData = replySnapshot.data() as CommunityReplyDoc;
    if (readStatus(replyData.status) !== 'visible') {
      throw new CommunityNotFoundError('This reply is no longer available.');
    }
    if (readString(replyData.postId) !== postId) {
      throw new CommunityError('This reply does not belong to the specified post.');
    }

    const postSnapshot = await transaction.get(postRef);
    assertPostDataReadableForReplies(
      postSnapshot.exists ? (postSnapshot.data() as CommunityPostDoc) : undefined,
      uid,
      isAdmin,
    );

    const reactionSnapshot = await transaction.get(reactionRef);
    const currentCounts = readReplyReactionCounts(replyData.reactionCounts);

    if (reactionSnapshot.exists) {
      // Toggle off / remove reaction
      reacted = false;
      transaction.delete(reactionRef);
      const updatedCount = Math.max(0, (currentCounts[emoji] ?? 0) - 1);
      if (updatedCount > 0) {
        currentCounts[emoji] = updatedCount;
      } else {
        delete currentCounts[emoji];
      }
    } else {
      // Add reaction
      reacted = true;
      transaction.set(reactionRef, {
        replyId,
        postId,
        userId: uid,
        emoji,
        createdAt: Timestamp.now(),
      });
      currentCounts[emoji] = (currentCounts[emoji] ?? 0) + 1;
    }

    transaction.update(replyRef, {
      reactionCounts: currentCounts,
      updatedAt: Timestamp.now(),
    });

    nextReactionCounts = currentCounts;
  });

  // Query all active reactions by this user for this reply
  const userReactionsSnapshot = await db
    .collection(REPLY_REACTIONS)
    .where('replyId', '==', replyId)
    .where('userId', '==', uid)
    .get();

  const myReactions = userReactionsSnapshot.docs
    .map((doc) => doc.data().emoji)
    .filter(isReplyEmoji);

  return {
    ok: true,
    reacted,
    emoji,
    reactionCounts: nextReactionCounts,
    myReactions,
  };
}

export async function toggleReaction(
  uid: string,
  postId: string,
  reaction: CommunityReaction,
): Promise<{
  ok: boolean;
  reacted: boolean;
  reaction: CommunityReaction;
  reactionCounts: Record<CommunityReaction, number>;
  myReactions: CommunityReaction[];
}> {
  const db = getCommunityFirestore();
  const memberRef = db.collection(MEMBERS).doc(uid);
  const postRef = db.collection(POSTS).doc(postId);
  const reactionRef = db
    .collection(REACTIONS)
    .doc(`${postId}_${uid}_${reaction}`);

  let reacted = false;
  let nextReactionCounts: Record<CommunityReaction, number> = emptyReactionCounts();

  await db.runTransaction(async (transaction) => {
    const memberSnapshot = await transaction.get(memberRef);
    const member = memberSnapshot.data() ?? {};
    // Reactions do not require guidelines acceptance, but they must respect
    // the transactional account-deletion fence.
    assertMemberNotDeleting(member);

    const postSnapshot = await transaction.get(postRef);
    if (!postSnapshot.exists) {
      throw new CommunityNotFoundError('This post does not exist.');
    }
    const postData = postSnapshot.data() as CommunityPostDoc;
    if (readStatus(postData.status) !== 'visible') {
      throw new CommunityNotFoundError('This post is no longer available.');
    }

    const reactionSnapshot = await transaction.get(reactionRef);
    const currentCounts = readReactionCounts(postData.reactionCounts);

    if (reactionSnapshot.exists) {
      // User is toggling off/removing an existing reaction
      reacted = false;
      transaction.delete(reactionRef);
      currentCounts[reaction] = Math.max(0, currentCounts[reaction] - 1);
    } else {
      // User is adding a supportive reaction
      reacted = true;
      transaction.set(reactionRef, {
        postId,
        userId: uid,
        reactionType: reaction,
        createdAt: Timestamp.now(),
      });
      currentCounts[reaction] = currentCounts[reaction] + 1;
    }

    transaction.update(postRef, {
      reactionCounts: currentCounts,
      updatedAt: Timestamp.now(),
    });

    nextReactionCounts = currentCounts;
  });

  // Query all active reactions by this user for this post
  const userReactionsSnapshot = await db
    .collection(REACTIONS)
    .where('postId', '==', postId)
    .where('userId', '==', uid)
    .get();

  const myReactions = userReactionsSnapshot.docs
    .map((doc) => doc.data().reactionType)
    .filter(isCommunityReaction);

  return {
    ok: true,
    reacted,
    reaction,
    reactionCounts: nextReactionCounts,
    myReactions,
  };
}

export async function listPosts(
  uid: string,
  options: {
    category: CommunityCategory | null;
    cursor: string | null;
    limit: number;
  },
): Promise<CommunityPostList> {
  const db = getCommunityFirestore();
  let query = db
    .collection(POSTS)
    .where('status', '==', 'visible');

  if (options.category) {
    query = query.where('category', '==', options.category);
  }

  query = query
    .orderBy('createdAt', 'desc')
    .orderBy(FieldPath.documentId(), 'desc')
    .limit(options.limit + 1);

  const decoded = decodeCursor(options.cursor);
  if (decoded) {
    query = query.startAfter(
      Timestamp.fromMillis(decoded.t),
      decoded.id,
    );
  }

  const snapshot = await query.get();
  const ordered = snapshot.docs.map((doc) => ({
    doc,
    data: doc.data() as CommunityPostDoc,
  }));
  const docs = ordered.slice(0, options.limit);
  const nextCursor =
    ordered.length > options.limit && docs.length > 0
      ? encodeCursor(
          timestampMillis(docs[docs.length - 1].data.createdAt),
          docs[docs.length - 1].doc.id,
        )
      : null;

  return {
    posts: docs.map(({ doc, data }) => toPublicPost(doc.id, data, uid)),
    nextCursor,
  };
}

export async function getPost(
  uid: string,
  postId: string,
  isAdmin = false,
): Promise<CommunityPost> {
  const db = getCommunityFirestore();
  const snapshot = await db.collection(POSTS).doc(postId).get();
  if (!snapshot.exists) {
    throw new CommunityNotFoundError();
  }

  const data = snapshot.data() as CommunityPostDoc;
  const status = readStatus(data.status);
  if (status === 'deleted') {
    throw new CommunityNotFoundError();
  }
  if (status === 'hidden' && !isAdmin && data.authorId !== uid) {
    throw new CommunityNotFoundError();
  }

  // Load the current user's reactions for this post
  const reactionsSnapshot = await db
    .collection(REACTIONS)
    .where('postId', '==', postId)
    .where('userId', '==', uid)
    .get();

  const myReactions = reactionsSnapshot.docs
    .map((doc) => doc.data().reactionType)
    .filter(isCommunityReaction);

  return toPublicPost(snapshot.id, data, uid, myReactions);
}

async function dismissOpenReportsForPosts(
  db: Firestore,
  postIds: string[],
): Promise<void> {
  if (postIds.length === 0) return;

  const now = Timestamp.now();

  for (let index = 0; index < postIds.length; index += 30) {
    const chunk = postIds.slice(index, index + 30);
    const openReports = await db
      .collection(REPORTS)
      .where('postId', 'in', chunk)
      .where('status', '==', 'open')
      .get();
    if (openReports.empty) continue;

    for (let start = 0; start < openReports.docs.length; start += 450) {
      const batch = db.batch();
      for (const report of openReports.docs.slice(start, start + 450)) {
        batch.update(report.ref, { status: 'dismissed', reviewedAt: now });
      }
      await batch.commit();
    }
  }
}

async function cleanupPostArtifacts(
  db: Firestore,
  postId: string,
): Promise<void> {
  // The post is gone from public view, so any open reports have nothing left to act on.
  await dismissOpenReportsForPosts(db, [postId]);

  // Clean up replies, post reactions, and reply reactions for this post.
  await deleteRepliesForPost(db, postId);
  await deleteReactionsForPost(db, postId);
  await deleteReplyReactionsForPost(db, postId);
}

async function deleteRepliesForPost(
  db: Firestore,
  postId: string,
): Promise<void> {
  for (;;) {
    const snapshot = await db
      .collection(REPLIES)
      .where('postId', '==', postId)
      .limit(100)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    if (snapshot.size < 100) break;
  }
}

async function deleteReactionsForPost(
  db: Firestore,
  postId: string,
): Promise<void> {
  for (;;) {
    const snapshot = await db
      .collection(REACTIONS)
      .where('postId', '==', postId)
      .limit(100)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    if (snapshot.size < 100) break;
  }
}

async function deleteReplyReactionsForPost(
  db: Firestore,
  postId: string,
): Promise<void> {
  for (;;) {
    const snapshot = await db
      .collection(REPLY_REACTIONS)
      .where('postId', '==', postId)
      .limit(100)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    if (snapshot.size < 100) break;
  }
}

export async function deletePost(uid: string, postId: string): Promise<void> {
  const db = getCommunityFirestore();
  const ref = db.collection(POSTS).doc(postId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new CommunityNotFoundError();
    }
    const data = snapshot.data() as CommunityPostDoc;
    if (data.authorId !== uid) {
      // Do not reveal whether someone else's post exists.
      throw new CommunityNotFoundError();
    }

    const status = readStatus(data.status);
    if (status !== 'deleted') {
      transaction.update(ref, {
        status: 'deleted',
        title: '',
        content: '',
        needsReview: false,
        reportCount: 0,
        replyCount: 0,
        reactionCounts: emptyReactionCounts(),
        cleanupPending: true,
        updatedAt: Timestamp.now(),
      });
    } else if (data.cleanupPending !== true) {
      // Already deleted and cleanup previously completed (or legacy state).
      throw new CommunityNotFoundError();
    }
    // Already deleted but cleanup still pending: allow retry to resume cleanup.
  });

  await cleanupPostArtifacts(db, postId);

  // Mark cleanup complete only after artifact cleanup succeeds.
  await ref
    .set(
      { cleanupPending: false, cleanupCompletedAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { merge: true },
    )
    .catch(() => {
      // Post may have been physically removed by another flow; cleanup is still done.
    });
}

export async function reportPost(
  uid: string,
  input: ReportPostInput,
): Promise<void> {
  const db = getCommunityFirestore();
  await enforceRateLimit(db, uid, 'report');

  const postRef = db.collection(POSTS).doc(input.postId);
  const reportRef = db
    .collection(REPORTS)
    .doc(`${input.postId}_${uid}`);

  await db.runTransaction(async (transaction) => {
    const postSnapshot = await transaction.get(postRef);
    if (!postSnapshot.exists) {
      throw new CommunityNotFoundError();
    }
    const post = postSnapshot.data() as CommunityPostDoc;
    if (readStatus(post.status) !== 'visible') {
      throw new CommunityNotFoundError();
    }
    if (post.authorId === uid) {
      throw new CommunityError("You can't report your own post.");
    }

    const reportSnapshot = await transaction.get(reportRef);
    if (reportSnapshot.exists && reportSnapshot.data()?.status === 'open') {
      throw new CommunityConflictError(
        'You already reported this post. A moderator will review it.',
        'already_reported',
      );
    }

    const reportCount = readNumber(post.reportCount) + 1;
    const now = Timestamp.now();

    transaction.set(reportRef, {
      reporterId: uid,
      targetType: 'post',
      postId: input.postId,
      targetId: input.postId,
      reason: input.reason,
      description: input.description,
      status: 'open',
      createdAt: now,
      reviewedAt: null,
    });

    transaction.update(postRef, {
      reportCount,
      needsReview: post.needsReview === true || reportCount >= 3,
      updatedAt: now,
    });
  });
}

export async function moderatePost(
  postId: string,
  action: 'hide' | 'restore' | 'dismiss-reports',
): Promise<void> {
  const db = getCommunityFirestore();
  const postRef = db.collection(POSTS).doc(postId);
  const postSnapshot = await postRef.get();
  if (!postSnapshot.exists) {
    throw new CommunityNotFoundError();
  }

  const postData = postSnapshot.data() as CommunityPostDoc;
  if (readStatus(postData.status) === 'deleted' && action !== 'dismiss-reports') {
    throw new CommunityError(
      'Deleted posts cannot be restored or hidden. Dismiss the remaining reports instead.',
      409,
      'post_deleted',
    );
  }

  if (action === 'dismiss-reports') {
    const openReports = await db
      .collection(REPORTS)
      .where('postId', '==', postId)
      .where('status', '==', 'open')
      .get();
    const batch = db.batch();
    const now = Timestamp.now();
    for (const report of openReports.docs) {
      batch.update(report.ref, { status: 'dismissed', reviewedAt: now });
    }
    batch.update(postRef, {
      reportCount: 0,
      needsReview: false,
      updatedAt: now,
    });
    await batch.commit();
    return;
  }

  await postRef.update({
    status: action === 'hide' ? 'hidden' : 'visible',
    updatedAt: Timestamp.now(),
  });
}

export async function getModerationQueue(options?: {
  repliesCursor?: string | null;
  repliesLimit?: number;
}): Promise<CommunityModerationQueue> {
  const db = getCommunityFirestore();
  const repliesLimit = Math.max(1, Math.min(options?.repliesLimit ?? 30, 50));

  const [openReports, flagged, hidden, flaggedRepliesSnapshot] = await Promise.all([
    db
      .collection(REPORTS)
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
    db
      .collection(POSTS)
      .where('needsReview', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get(),
    db
      .collection(POSTS)
      .where('status', '==', 'hidden')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get(),
    (async () => {
      let repliesQuery = db
        .collection(REPLIES)
        .where('needsReview', '==', true)
        .orderBy('createdAt', 'desc')
        .orderBy(FieldPath.documentId(), 'desc')
        .limit(repliesLimit + 1);

      const decoded = decodeCursor(options?.repliesCursor ?? null);
      if (decoded) {
        const cursorDoc = await db.collection(REPLIES).doc(decoded.id).get();
        if (cursorDoc.exists) {
          const cursorData = cursorDoc.data() as CommunityReplyDoc;
          if (
            cursorData.needsReview === true &&
            readStatus(cursorData.status) !== 'deleted'
          ) {
            repliesQuery = repliesQuery.startAfter(cursorDoc);
          }
        }
      }

      return repliesQuery.get();
    })(),
  ]);

  const posts = new Map<string, CommunityModerationPost>();
  const addPost = (doc: QueryDocumentSnapshot | DocumentSnapshot) => {
    if (!posts.has(doc.id)) {
      posts.set(
        doc.id,
        toModerationPost(doc.id, doc.data() as CommunityPostDoc),
      );
    }
  };
  flagged.docs.forEach(addPost);
  hidden.docs.forEach(addPost);

  const replyDocs = flaggedRepliesSnapshot.docs
    .filter((doc) => {
      const data = doc.data() as CommunityReplyDoc;
      return data.needsReview === true && readStatus(data.status) !== 'deleted';
    })
    .slice(0, repliesLimit);

  const repliesNextCursor =
    flaggedRepliesSnapshot.docs.length > repliesLimit && replyDocs.length > 0
      ? encodeCursor(
          timestampMillis(
            (replyDocs[replyDocs.length - 1].data() as CommunityReplyDoc).createdAt,
          ),
          replyDocs[replyDocs.length - 1].id,
        )
      : null;

  return {
    posts: [...posts.values()],
    replies: replyDocs.map((doc) =>
      toModerationReply(doc.id, doc.data() as CommunityReplyDoc),
    ),
    reports: openReports.docs.map((doc) =>
      toModerationReport(doc.id, doc.data() as CommunityReportDoc),
    ),
    repliesNextCursor,
  };
}

export async function moderateReply(
  postId: string,
  replyId: string,
  action: 'hide' | 'restore' | 'dismiss-reports',
): Promise<void> {
  const db = getCommunityFirestore();
  const replyRef = db.collection(REPLIES).doc(replyId);

  let shouldCleanupReactions = false;

  await db.runTransaction(async (transaction) => {
    const replySnapshot = await transaction.get(replyRef);
    if (!replySnapshot.exists) {
      throw new CommunityNotFoundError();
    }
    const replyData = replySnapshot.data() as CommunityReplyDoc;
    if (readString(replyData.postId) !== postId) {
      // Do not reveal reply existence across posts.
      throw new CommunityNotFoundError();
    }

    const status = readStatus(replyData.status);
    const needsReview = replyData.needsReview === true;
    const postRef = db.collection(POSTS).doc(postId);
    const postSnapshot = await transaction.get(postRef);
    const postExists = postSnapshot.exists;
    const postData = postExists
      ? (postSnapshot.data() as CommunityPostDoc)
      : null;
    const postVisible =
      postData !== null && readStatus(postData.status) === 'visible';
    const now = Timestamp.now();

    if (status === 'deleted') {
      if (replyData.reactionCleanupPending === true) {
        shouldCleanupReactions = true;
      }
      return;
    }

    if (action === 'restore') {
      if (needsReview && status !== 'visible') {
        if (!postVisible) {
          throw new CommunityError(
            'This reply cannot be approved because its post is not available.',
            409,
            'post_unavailable',
          );
        }
        transaction.update(replyRef, {
          status: 'visible',
          needsReview: false,
          updatedAt: now,
        });
        transaction.update(postRef, {
          replyCount: FieldValue.increment(1),
          updatedAt: now,
        });
        return;
      }

      // No-op safe restore for non-pending replies (keeps existing semantics simple).
      if (status === 'hidden' && !needsReview) {
        transaction.update(replyRef, { status: 'visible', updatedAt: now });
      }
      return;
    }

    if (action === 'dismiss-reports') {
      if (!needsReview) return;
      transaction.update(replyRef, {
        needsReview: false,
        updatedAt: now,
      });
      return;
    }

    // hide => reject/remove pending reply (or hide visible reply)
    if (needsReview && status !== 'visible') {
      transaction.update(replyRef, {
        status: 'deleted',
        content: '',
        needsReview: false,
        reactionCounts: {},
        reactionCleanupPending: true,
        updatedAt: now,
      });
      shouldCleanupReactions = true;
      return;
    }

    if (status === 'visible') {
      transaction.update(replyRef, {
        status: 'hidden',
        needsReview: false,
        reactionCounts: {},
        reactionCleanupPending: true,
        updatedAt: now,
      });
      if (postExists) {
        transaction.update(postRef, {
          replyCount: FieldValue.increment(-1),
          updatedAt: now,
        });
      }
      shouldCleanupReactions = true;
    }
  });

  if (shouldCleanupReactions) {
    await deleteReplyReactionsForReply(db, replyId);
    await replyRef
      .set(
        {
          reactionCleanupPending: false,
          reactionCleanupCompletedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      )
      .catch(() => {
        // Reply may have been physically removed; cleanup is done.
      });
  }
}

async function markPostDeletionTarget(
  db: Firestore,
  uid: string,
  postRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  const targetRef = db
    .collection(MEMBERS)
    .doc(uid)
    .collection(DELETION_POST_TARGETS)
    .doc(postRef.id);

  const [postSnapshot, targetSnapshot] = await Promise.all([
    postRef.get(),
    targetRef.get(),
  ]);
  if (!postSnapshot.exists) return;

  const postData = postSnapshot.data() as CommunityPostDoc;
  const status = readStatus(postData.status);
  const batch = db.batch();
  let hasWrite = false;

  if (status !== 'deleted' || postData.cleanupPending !== true) {
    batch.set(
      postRef,
      {
        status: 'deleted',
        title: '',
        content: '',
        needsReview: false,
        reportCount: 0,
        replyCount: 0,
        reactionCounts: emptyReactionCounts(),
        cleanupPending: true,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    hasWrite = true;
  }

  if (!targetSnapshot.exists) {
    batch.set(targetRef, {
      postId: postRef.id,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    hasWrite = true;
  }

  if (hasWrite) {
    await batch.commit();
  }
}

async function ensureAccountDeletionTargets(
  db: Firestore,
  uid: string,
  memberRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  const memberSnapshot = await memberRef.get();
  const memberData = memberSnapshot.data() ?? {};

  // One-time migration from legacy in-document array to scalable target docs.
  const legacyIds = Array.isArray(memberData.deletionTargetPostIds)
    ? memberData.deletionTargetPostIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      )
    : [];
  if (legacyIds.length > 0) {
    for (const postId of legacyIds) {
      const postRef = db.collection(POSTS).doc(postId);
      const targetRef = memberRef.collection(DELETION_POST_TARGETS).doc(postId);
      const [postSnapshot, targetSnapshot] = await Promise.all([
        postRef.get(),
        targetRef.get(),
      ]);
      if (!targetSnapshot.exists) {
        await targetRef.set({
          postId,
          status: 'pending',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      if (postSnapshot.exists) {
        const postData = postSnapshot.data() as CommunityPostDoc;
        const status = readStatus(postData.status);
        if (status !== 'deleted' || postData.cleanupPending !== true) {
          await postRef.set(
            {
              status: 'deleted',
              title: '',
              content: '',
              needsReview: false,
              reportCount: 0,
              replyCount: 0,
              reactionCounts: emptyReactionCounts(),
              cleanupPending: true,
              updatedAt: Timestamp.now(),
            },
            { merge: true },
          );
        }
      }
    }
    await memberRef.set(
      {
        deletionTargetsRecorded: true,
        deletionTargetsRecordedAt:
          memberData.deletionTargetsRecordedAt ?? Timestamp.now(),
        deletionTargetPostIds: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return;
  }

  if (memberData.deletionTargetsRecorded === true) {
    return;
  }

  // Record durable per-post targets before any physical post deletion.
  for (;;) {
    const snapshot = await db
      .collection(POSTS)
      .where('authorId', '==', uid)
      .limit(50)
      .get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      await markPostDeletionTarget(db, uid, doc.ref);
    }

    if (snapshot.size < 50) break;
  }

  await memberRef.set(
    {
      deletionTargetsRecorded: true,
      deletionTargetsRecordedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

async function processAccountDeletionPostTargets(
  db: Firestore,
  uid: string,
): Promise<number> {
  let deletedPosts = 0;
  const targetsRef = db
    .collection(MEMBERS)
    .doc(uid)
    .collection(DELETION_POST_TARGETS);

  for (;;) {
    const snapshot = await targetsRef.limit(50).get();
    if (snapshot.empty) break;

    for (const targetDoc of snapshot.docs) {
      const postId =
        typeof targetDoc.data().postId === 'string'
          ? (targetDoc.data().postId as string)
          : targetDoc.id;
      const targetStatus = readString(targetDoc.data().status);
      const postRef = db.collection(POSTS).doc(postId);

      if (targetStatus !== 'post_deleted') {
        // Idempotent cleanup while post (or its remnants) is still addressable.
        await cleanupPostArtifacts(db, postId);

        const postSnapshot = await postRef.get();
        if (postSnapshot.exists) {
          await db.recursiveDelete(postRef).catch(() => {
            // If already removed or partially removed, retry can resume safely.
          });
          deletedPosts += 1;
        }

        await targetDoc.ref.set(
          {
            status: 'post_deleted',
            postDeletedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
      } else {
        // Resume-safe: ensure physical post removal completed.
        const postSnapshot = await postRef.get();
        if (postSnapshot.exists) {
          await db.recursiveDelete(postRef).catch(() => {
            // Retry can resume safely.
          });
          deletedPosts += 1;
        }
      }

      await targetDoc.ref.delete().catch(() => {
        // Missing target doc is already the desired state.
      });
    }
  }

  return deletedPosts;
}

async function cleanupUserRepliesForAccountDeletion(
  db: Firestore,
  uid: string,
  memberRef: FirebaseFirestore.DocumentReference,
): Promise<number> {
  let deletedReplies = 0;
  const targetsRef = memberRef.collection(DELETION_POST_TARGETS);

  for (;;) {
    const snapshot = await db
      .collection(REPLIES)
      .where('authorId', '==', uid)
      .limit(50)
      .get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data() as CommunityReplyDoc;

      if (data.deletionCountAdjusted !== true) {
        const postId = readString(data.postId);
        let shouldDecrement = false;
        if (postId && readStatus(data.status) === 'visible') {
          const [postSnapshot, targetSnapshot] = await Promise.all([
            db.collection(POSTS).doc(postId).get(),
            targetsRef.doc(postId).get(),
          ]);
          shouldDecrement =
            !targetSnapshot.exists &&
            postSnapshot.exists &&
            readStatus((postSnapshot.data() as CommunityPostDoc).status) !==
              'deleted';
        }

        await db.runTransaction(async (transaction) => {
          const freshReply = await transaction.get(doc.ref);
          if (!freshReply.exists) return;
          const freshData = freshReply.data() as CommunityReplyDoc;
          if (freshData.deletionCountAdjusted === true) return;

          if (shouldDecrement) {
            const postIdForDec = readString(freshData.postId);
            if (postIdForDec) {
              const postRef = db.collection(POSTS).doc(postIdForDec);
              const postSnapshot = await transaction.get(postRef);
              if (postSnapshot.exists) {
                const postData = postSnapshot.data() as CommunityPostDoc;
                if (readStatus(postData.status) !== 'deleted') {
                  const currentReplyCount = readNumber(postData.replyCount);
                  transaction.update(postRef, {
                    replyCount: Math.max(0, currentReplyCount - 1),
                    updatedAt: Timestamp.now(),
                  });
                }
              }
            }
          }

          transaction.set(
            doc.ref,
            {
              deletionCountAdjusted: true,
              deletionCountAdjustedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            },
            { merge: true },
          );
        });
      }

      // Reply reactions are owned by this reply; remove before deleting reply.
      await deleteReplyReactionsForReply(db, doc.id);
      await doc.ref.delete().catch(() => {
        // Missing reply doc is already the desired state.
      });
      deletedReplies += 1;
    }
  }

  return deletedReplies;
}

async function cleanupUserPostReactionsForAccountDeletion(
  db: Firestore,
  uid: string,
  memberRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  const targetsRef = memberRef.collection(DELETION_POST_TARGETS);

  for (;;) {
    const snapshot = await db
      .collection(REACTIONS)
      .where('userId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data() as CommunityReactionDoc;

      if (data.deletionCountAdjusted !== true) {
        const postId = readString(data.postId);
        const reaction = data.reactionType;
        let shouldDecrement = false;
        if (postId && isCommunityReaction(reaction)) {
          const [postSnapshot, targetSnapshot] = await Promise.all([
            db.collection(POSTS).doc(postId).get(),
            targetsRef.doc(postId).get(),
          ]);
          shouldDecrement =
            !targetSnapshot.exists &&
            postSnapshot.exists &&
            readStatus((postSnapshot.data() as CommunityPostDoc).status) !==
              'deleted';
        }

        await db.runTransaction(async (transaction) => {
          const fresh = await transaction.get(doc.ref);
          if (!fresh.exists) return;
          const freshData = fresh.data() as CommunityReactionDoc;
          if (freshData.deletionCountAdjusted === true) return;

          if (shouldDecrement && isCommunityReaction(freshData.reactionType)) {
            const postIdForDec = readString(freshData.postId);
            if (postIdForDec) {
              const postRef = db.collection(POSTS).doc(postIdForDec);
              const postSnapshot = await transaction.get(postRef);
              if (postSnapshot.exists) {
                const postData = postSnapshot.data() as CommunityPostDoc;
                if (readStatus(postData.status) !== 'deleted') {
                  const currentCounts = readReactionCounts(
                    postData.reactionCounts,
                  );
                  currentCounts[freshData.reactionType] = Math.max(
                    0,
                    (currentCounts[freshData.reactionType] ?? 0) - 1,
                  );
                  transaction.update(postRef, {
                    reactionCounts: currentCounts,
                    updatedAt: Timestamp.now(),
                  });
                }
              }
            }
          }

          transaction.set(
            doc.ref,
            {
              deletionCountAdjusted: true,
              deletionCountAdjustedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            },
            { merge: true },
          );
        });
      }

      await doc.ref.delete().catch(() => {
        // Missing reaction doc is already the desired state.
      });
    }
  }
}

async function cleanupUserReplyReactionsForAccountDeletion(
  db: Firestore,
  uid: string,
): Promise<void> {
  for (;;) {
    const snapshot = await db
      .collection(REPLY_REACTIONS)
      .where('userId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data() as CommunityReplyReactionDoc;

      if (data.deletionCountAdjusted !== true) {
        const replyId = readString(data.replyId);
        const emoji = readString(data.emoji);
        let shouldDecrement = false;
        if (replyId && isReplyEmoji(emoji)) {
          const replySnapshot = await db.collection(REPLIES).doc(replyId).get();
          shouldDecrement =
            replySnapshot.exists &&
            readStatus((replySnapshot.data() as CommunityReplyDoc).status) !==
              'deleted';
        }

        await db.runTransaction(async (transaction) => {
          const fresh = await transaction.get(doc.ref);
          if (!fresh.exists) return;
          const freshData = fresh.data() as CommunityReplyReactionDoc;
          if (freshData.deletionCountAdjusted === true) return;

          if (shouldDecrement) {
            const replyIdForDec = readString(freshData.replyId);
            const emojiForDec = readString(freshData.emoji);
            if (replyIdForDec && isReplyEmoji(emojiForDec)) {
              const replyRef = db.collection(REPLIES).doc(replyIdForDec);
              const replySnapshot = await transaction.get(replyRef);
              if (replySnapshot.exists) {
                const replyData = replySnapshot.data() as CommunityReplyDoc;
                if (readStatus(replyData.status) !== 'deleted') {
                  const currentCounts = readReplyReactionCounts(
                    replyData.reactionCounts,
                  );
                  const updated = Math.max(
                    0,
                    (currentCounts[emojiForDec] ?? 0) - 1,
                  );
                  if (updated > 0) {
                    currentCounts[emojiForDec] = updated;
                  } else {
                    delete currentCounts[emojiForDec];
                  }
                  transaction.update(replyRef, {
                    reactionCounts: currentCounts,
                    updatedAt: Timestamp.now(),
                  });
                }
              }
            }
          }

          transaction.set(
            doc.ref,
            {
              deletionCountAdjusted: true,
              deletionCountAdjustedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            },
            { merge: true },
          );
        });
      }

      await doc.ref.delete().catch(() => {
        // Missing reply-reaction doc is already the desired state.
      });
    }
  }
}

export async function deleteMyCommunityData(uid: string): Promise<{
  deletedPosts: number;
  deletedReports: number;
  deletedReplies: number;
}> {
  const db = getCommunityFirestore();
  const memberRef = db.collection(MEMBERS).doc(uid);

  // Fence: block new participation before recording/removing content.
  await memberRef.set(
    {
      deletionState: 'deleting',
      deletionStartedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );

  // Durable, scalable post targets (member subcollection) recorded before physical deletion.
  await ensureAccountDeletionTargets(db, uid, memberRef);

  // Idempotent artifact cleanup and physical post deletion, processed in bounded pages.
  const deletedPosts = await processAccountDeletionPostTargets(db, uid);

  // Delete user-authored replies and adjust counts on others' posts durably/idempotently.
  const deletedReplies = await cleanupUserRepliesForAccountDeletion(
    db,
    uid,
    memberRef,
  );

  // Delete user-authored post reactions and adjust counts durably/idempotently.
  await cleanupUserPostReactionsForAccountDeletion(db, uid, memberRef);

  // Delete user-authored reply reactions and adjust counts durably/idempotently.
  await cleanupUserReplyReactionsForAccountDeletion(db, uid);

  // Delete reports made by this user.
  let deletedReports = 0;
  for (;;) {
    const snapshot = await db
      .collection(REPORTS)
      .where('reporterId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deletedReports += snapshot.size;
    if (snapshot.size < 100) break;
  }

  // Clear the durable fence/state only after all cleanup steps completed.
  await memberRef.delete();

  return { deletedPosts, deletedReports, deletedReplies };
}
