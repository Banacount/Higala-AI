import {
  FieldPath,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {
  COMMUNITY_REACTION_IDS,
  emptyReactionCounts,
  isCommunityCategory,
  type CommunityCategory,
  type CommunityMe,
  type CommunityModerationPost,
  type CommunityModerationQueue,
  type CommunityModerationReport,
  type CommunityPost,
  type CommunityPostList,
  type CommunityPostStatus,
  type CommunityReaction,
  type CommunityReportReason,
} from '../src/shared/community.ts';
import { isRiskLevel, type RiskLevel } from '../src/shared/types.ts';
import {
  CommunityConflictError,
  CommunityError,
  CommunityNotFoundError,
  CommunityRateLimitError,
} from './communityErrors.ts';
import { getCommunityFirestore } from './firebaseAdmin.ts';
import type { CreatePostInput, ReportPostInput } from './communityValidation.ts';

const POSTS = 'communityPosts';
const REPORTS = 'communityReports';
const MEMBERS = 'communityMembers';

const POST_WINDOW_MS = 10 * 60_000;
const POST_WINDOW_MAX = 6;
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
    isMine: data.authorId === uid,
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
  const member = await getMember(uid);
  if (!member.guidelinesAcceptedAt) {
    throw new CommunityError(
      'Please read and accept the community guidelines before your first post.',
      403,
      'guidelines_required',
    );
  }

  const db = getCommunityFirestore();
  await enforceRateLimit(db, uid, 'post');

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

  await ref.create(data);

  return {
    id: ref.id,
    title: input.title,
    content: input.content,
    category: input.category,
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
    replyCount: 0,
    reactionCounts,
    isMine: true,
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
  const docs = snapshot.docs.slice(0, options.limit);
  const nextCursor =
    snapshot.docs.length > options.limit && docs.length > 0
      ? encodeCursor(
          timestampMillis(docs[docs.length - 1].data().createdAt),
          docs[docs.length - 1].id,
        )
      : null;

  return {
    posts: docs.map((doc) =>
      toPublicPost(doc.id, doc.data() as CommunityPostDoc, uid),
    ),
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

  return toPublicPost(snapshot.id, data, uid);
}

async function dismissOpenReportsForPosts(
  db: Firestore,
  postIds: string[],
): Promise<void> {
  const now = Timestamp.now();
  for (const postId of postIds) {
    const openReports = await db
      .collection(REPORTS)
      .where('postId', '==', postId)
      .where('status', '==', 'open')
      .get();
    if (openReports.empty) continue;
    const batch = db.batch();
    for (const report of openReports.docs) {
      batch.update(report.ref, { status: 'dismissed', reviewedAt: now });
    }
    await batch.commit();
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
      updatedAt: Timestamp.now(),
    });
  });

  // The post is gone, so any open reports about it have nothing left to act on.
  // Closing them keeps the moderation queue free of dead links.
  await dismissOpenReportsForPosts(db, [postId]);
}

export async function reportPost(
  uid: string,
  input: ReportPostInput,
): Promise<void> {
  const db = getCommunityFirestore();
  await enforceRateLimit(db, uid, 'report');

  const postRef = db.collection(POSTS).doc(input.postId);
  // Deterministic ID keeps one report per member per post and lets someone
  // report again after a previous report was dismissed.
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

  return { deletedPosts, deletedReports };
}
