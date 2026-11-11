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
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface CommunityReactionDoc {
  postId?: unknown;
  userId?: unknown;
  reactionType?: unknown;
  createdAt?: unknown;
}

interface CommunityReplyReactionDoc {
  replyId?: unknown;
  postId?: unknown;
  userId?: unknown;
  emoji?: unknown;
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

    if (timestampMillis(member.guidelinesAcceptedAt) <= 0) {
      throw new CommunityError(
        'Please read and accept the community guidelines before your first post.',
        403,
        'guidelines_required',
      );
    }

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
    status: 'visible',
    riskLevel: moderation.riskLevel,
    needsReview: moderation.needsReview,
    reactionCounts: {},
    createdAt: now,
    updatedAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const memberSnapshot = await transaction.get(memberRef);
    const member = memberSnapshot.data() ?? {};

    if (timestampMillis(member.guidelinesAcceptedAt) <= 0) {
      throw new CommunityError(
        'Please read and accept the community guidelines before your first reply.',
        403,
        'guidelines_required',
      );
    }

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

    transaction.update(postRef, {
      replyCount: FieldValue.increment(1),
      updatedAt: now,
    });

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
): Promise<CommunityReply[]> {
  const db = getCommunityFirestore();
  const [repliesSnapshot, userReactionsSnapshot] = await Promise.all([
    db
      .collection(REPLIES)
      .where('postId', '==', postId)
      .get(),
    db
      .collection(REPLY_REACTIONS)
      .where('postId', '==', postId)
      .where('userId', '==', uid)
      .get(),
  ]);

  const userReactionsByReplyId = new Map<string, string[]>();
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

  const visibleReplies = repliesSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      data: doc.data() as CommunityReplyDoc,
    }))
    .filter(({ data }) => readStatus(data.status) === 'visible');

  visibleReplies.sort(
    (a, b) =>
      timestampMillis(a.data.createdAt) - timestampMillis(b.data.createdAt),
  );

  return visibleReplies.map(({ id, data }) =>
    toPublicReply(id, data, uid, userReactionsByReplyId.get(id) ?? []),
  );
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

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(replyRef);
    if (!snapshot.exists) {
      throw new CommunityNotFoundError();
    }
    const data = snapshot.data() as CommunityReplyDoc;
    if (data.authorId !== uid) {
      // Do not reveal whether someone else's reply exists.
      throw new CommunityNotFoundError();
    }
    if (readStatus(data.status) === 'deleted') {
      throw new CommunityNotFoundError();
    }

    const postId = readString(data.postId);
    const postRef = db.collection(POSTS).doc(postId);
    const postSnapshot = await transaction.get(postRef);

    transaction.update(replyRef, {
      status: 'deleted',
      content: '',
      needsReview: false,
      reactionCounts: {},
      updatedAt: Timestamp.now(),
    });

    if (postSnapshot.exists) {
      const currentReplyCount = readNumber(
        (postSnapshot.data() as CommunityPostDoc).replyCount,
      );
      transaction.update(postRef, {
        replyCount: Math.max(0, currentReplyCount - 1),
        updatedAt: Timestamp.now(),
      });
    }
  });

  // Clean up any reactions that were on this reply
  await deleteReplyReactionsForReply(db, replyId);
}

export async function toggleReplyReaction(
  uid: string,
  postId: string,
  replyId: string,
  emoji: ReplyEmoji,
): Promise<{
  ok: boolean;
  reacted: boolean;
  emoji: ReplyEmoji;
  reactionCounts: Record<string, number>;
  myReactions: string[];
}> {
  const db = getCommunityFirestore();
  const replyRef = db.collection(REPLIES).doc(replyId);
  const reactionRef = db
    .collection(REPLY_REACTIONS)
    .doc(`${replyId}_${uid}_${encodeURIComponent(emoji)}`);

  let reacted = false;
  let nextReactionCounts: Record<string, number> = {};

  await db.runTransaction(async (transaction) => {
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
  const postRef = db.collection(POSTS).doc(postId);
  const reactionRef = db
    .collection(REACTIONS)
    .doc(`${postId}_${uid}_${reaction}`);

  let reacted = false;
  let nextReactionCounts: Record<CommunityReaction, number> = emptyReactionCounts();

  await db.runTransaction(async (transaction) => {
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
    if (readStatus(data.status) === 'deleted') {
      throw new CommunityNotFoundError();
    }

    transaction.update(ref, {
      status: 'deleted',
      title: '',
      content: '',
      needsReview: false,
      reportCount: 0,
      replyCount: 0,
      reactionCounts: emptyReactionCounts(),
      updatedAt: Timestamp.now(),
    });
  });

  // The post is gone, so any open reports about it have nothing left to act on.
  await dismissOpenReportsForPosts(db, [postId]);

  // Clean up replies, post reactions, and reply reactions for this post
  await deleteRepliesForPost(db, postId);
  await deleteReactionsForPost(db, postId);
  await deleteReplyReactionsForPost(db, postId);
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

export async function getModerationQueue(): Promise<CommunityModerationQueue> {
  const db = getCommunityFirestore();

  const [openReports, flagged, hidden] = await Promise.all([
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

  return {
    posts: [...posts.values()],
    reports: openReports.docs.map((doc) =>
      toModerationReport(doc.id, doc.data() as CommunityReportDoc),
    ),
  };
}

export async function deleteMyCommunityData(uid: string): Promise<{
  deletedPosts: number;
  deletedReports: number;
  deletedReplies: number;
}> {
  const db = getCommunityFirestore();

  let deletedPosts = 0;
  const deletedPostIds: string[] = [];
  for (;;) {
    const snapshot = await db
      .collection(POSTS)
      .where('authorId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;
    deletedPostIds.push(...snapshot.docs.map((doc) => doc.id));
    await Promise.all(
      snapshot.docs.map((doc) => db.recursiveDelete(doc.ref)),
    );
    deletedPosts += snapshot.size;
    if (snapshot.size < 100) break;
  }

  // Reports other people made about these posts have no target anymore.
  await dismissOpenReportsForPosts(db, deletedPostIds);

  // Clean up replies, post reactions, and reply reactions for the deleted posts
  for (const postId of deletedPostIds) {
    await deleteRepliesForPost(db, postId);
    await deleteReactionsForPost(db, postId);
    await deleteReplyReactionsForPost(db, postId);
  }

  // Delete all replies authored by this user, and adjust replyCount on posts by others
  let deletedReplies = 0;
  const postReplyDecrements = new Map<string, number>();

  for (;;) {
    const snapshot = await db
      .collection(REPLIES)
      .where('authorId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data() as CommunityReplyDoc;
      if (readStatus(data.status) === 'visible') {
        const postId = readString(data.postId);
        if (postId) {
          postReplyDecrements.set(
            postId,
            (postReplyDecrements.get(postId) ?? 0) + 1,
          );
        }
      }
    }

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    deletedReplies += snapshot.size;
    if (snapshot.size < 100) break;
  }

  // Adjust replyCount on posts authored by other people
  for (const [postId, count] of postReplyDecrements.entries()) {
    if (deletedPostIds.includes(postId)) continue;
    const postRef = db.collection(POSTS).doc(postId);
    await db.runTransaction(async (transaction) => {
      const postSnapshot = await transaction.get(postRef);
      if (postSnapshot.exists) {
        const currentReplyCount = readNumber(
          (postSnapshot.data() as CommunityPostDoc).replyCount,
        );
        transaction.update(postRef, {
          replyCount: Math.max(0, currentReplyCount - count),
          updatedAt: Timestamp.now(),
        });
      }
    }).catch(() => {
      // Best-effort cleanup
    });
  }

  // Delete all post reactions authored by this user, and adjust reactionCounts on posts by others
  const postReactionDecrements = new Map<string, Record<CommunityReaction, number>>();

  for (;;) {
    const snapshot = await db
      .collection(REACTIONS)
      .where('userId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data() as CommunityReactionDoc;
      const postId = readString(data.postId);
      const reaction = data.reactionType as CommunityReaction;
      if (postId && isCommunityReaction(reaction)) {
        if (!postReactionDecrements.has(postId)) {
          postReactionDecrements.set(postId, emptyReactionCounts());
        }
        const counts = postReactionDecrements.get(postId)!;
        counts[reaction] = (counts[reaction] ?? 0) + 1;
      }
    }

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    if (snapshot.size < 100) break;
  }

  // Adjust reactionCounts on posts
  for (const [postId, decrements] of postReactionDecrements.entries()) {
    if (deletedPostIds.includes(postId)) continue;
    const postRef = db.collection(POSTS).doc(postId);
    await db.runTransaction(async (transaction) => {
      const postSnapshot = await transaction.get(postRef);
      if (postSnapshot.exists) {
        const postData = postSnapshot.data() as CommunityPostDoc;
        const currentCounts = readReactionCounts(postData.reactionCounts);
        for (const [reaction, dec] of Object.entries(decrements) as [CommunityReaction, number][]) {
          currentCounts[reaction] = Math.max(0, currentCounts[reaction] - dec);
        }
        transaction.update(postRef, {
          reactionCounts: currentCounts,
          updatedAt: Timestamp.now(),
        });
      }
    }).catch(() => {
      // Best-effort
    });
  }

  // Delete all reply reactions authored by this user, and adjust reactionCounts on replies by others
  const replyReactionDecrements = new Map<string, Record<string, number>>();

  for (;;) {
    const snapshot = await db
      .collection(REPLY_REACTIONS)
      .where('userId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const data = doc.data() as CommunityReplyReactionDoc;
      const replyId = readString(data.replyId);
      const emoji = readString(data.emoji);
      if (replyId && isReplyEmoji(emoji)) {
        if (!replyReactionDecrements.has(replyId)) {
          replyReactionDecrements.set(replyId, {});
        }
        const counts = replyReactionDecrements.get(replyId)!;
        counts[emoji] = (counts[emoji] ?? 0) + 1;
      }
    }

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    if (snapshot.size < 100) break;
  }

  // Adjust reactionCounts on replies
  for (const [replyId, decrements] of replyReactionDecrements.entries()) {
    const replyRef = db.collection(REPLIES).doc(replyId);
    await db.runTransaction(async (transaction) => {
      const replySnapshot = await transaction.get(replyRef);
      if (replySnapshot.exists) {
        const replyData = replySnapshot.data() as CommunityReplyDoc;
        const currentCounts = readReplyReactionCounts(replyData.reactionCounts);
        for (const [emoji, dec] of Object.entries(decrements)) {
          const updated = Math.max(0, (currentCounts[emoji] ?? 0) - dec);
          if (updated > 0) {
            currentCounts[emoji] = updated;
          } else {
            delete currentCounts[emoji];
          }
        }
        transaction.update(replyRef, {
          reactionCounts: currentCounts,
          updatedAt: Timestamp.now(),
        });
      }
    }).catch(() => {
      // Best-effort
    });
  }

  let deletedReports = 0;
  for (;;) {
    const snapshot = await db
      .collection(REPORTS)
      .where('reporterId', '==', uid)
      .limit(100)
      .get();
    if (snapshot.empty) break;
    await Promise.all(
      snapshot.docs.map((doc) => db.recursiveDelete(doc.ref)),
    );
    deletedReports += snapshot.size;
    if (snapshot.size < 100) break;
  }

  await db
    .collection(MEMBERS)
    .doc(uid)
    .delete()
    .catch(() => {
      // A missing member document is already the desired end state.
    });

  return { deletedPosts, deletedReports, deletedReplies };
}
