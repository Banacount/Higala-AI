# CodeRabbit Fix Progress � Community Reply System (PR #6)

## Scope
Findings 1-8 + A (reply moderation queue) + B (concurrent deletion/reply creation).

## Batch 1 (implemented, pending verification)
- #1 Reply reads bypass parent-post authorization � **implemented**: `listReplies` enforces server-side parent-post existence/visibility before returning replies.
- #2 Unbounded reply reads � **implemented**: Firestore `postId+status=='visible'` filter, ordered, limit/cursor pagination (`nextCursor`), API/client/hook/UI �Load more�.

## Batch 2 (implemented + hardened, pending verification)
- #3 Post deletion cleanup not retryable � **implemented**: resumable/idempotent `cleanupPostArtifacts`, `cleanupPending` marker, retry allowed while cleanup pending.
- #4 Account deletion loses cleanup targets � **implemented**: fence + durable per-post targets in `communityMembers/{uid}/deletionPostTargets`, legacy array migration, bounded/paginated recording/processing, member cleared only on completion.
- B Concurrent account erasure and reply creation � **partially mitigated**: `deletionState==='deleting'` checked in participation/rate-limit/create paths with fence lifecycle; not formally proven across all races/ops.
- Hardening: per-source `deletionCountAdjusted` markers make count adjustments recoverable and idempotent before source deletion.

## Batch 3 (implemented, pending verification)
- #5 Explicit Community Guidelines acceptance � **implemented**: no auto-accept on �Post reply�; guidelines shown, explicit server-persisted acceptance action required, submission blocked until accepted then user retries post.
- #6 StrictMode sessionStorage inconsistency � **implemented**: pure initializer, storage write moved to `useEffect` with safe try/catch.
- #7 Stale reply loads overwrite successful mutations � **implemented**: mutations invalidate in-flight loads via requestId bump; append/dedupe and cursor handling preserved.

## Batch 4A (implemented, pending deployment verification)
- #8 Immutable caching of SPA fallback HTML � **implemented**: `vercel.json` rewrite narrowed to exclude `/assets/` and `/api/`; asset immutable caching preserved.

## Batch 4B (implemented + hardened, pending behavioral verification; **not marked resolved**)
- #A Reply moderation queue/actions � **implemented**:
  - **Queue pagination/ordering:** admin-only `GET moderation` accepts bounded `repliesCursor`/`repliesLimit` (validated). `getModerationQueue` queries `REPLIES where needsReview==true orderBy(createdAt desc, __name__ desc)` with `limit+1`, resumes only from a cursor doc that exists and still `needsReview` (non-deleted), filters defensively, returns `replies` page + `repliesNextCursor`. Added replies index `(needsReview, createdAt desc, __name__ desc)` in `firestore.indexes.json`. Posts/reports behavior preserved.
  - **Pending reply client behavior:** create-reply response includes `pendingReview` (server-screened). Client/UI: pending replies are not added to public list and do not increment public reply count; user sees �submitted for review�� feedback (anonymous, no moderation internals). Publicly visible replies continue to be added and count incremented normally.
  - **Count consistency:** flagged replies created `hidden` with no `replyCount` increment. `moderateReply` (tx, admin/validated, reply-post binding): approve pending -> visible, clears needsReview, increments post `replyCount` once (requires visible parent post); reject pending -> deleted/cleared, no count change; hide visible -> hidden, decrements count once; dismiss-reports clears flag; deleted replies no-op. `deleteReply` (owner-only) decrements only if reply was publicly visible; idempotent resume allowed when `reactionCleanupPending`.
  - **Reaction cleanup retries:** moderation/delete paths that remove reactions set `reactionCleanupPending` in tx, run idempotent `deleteReplyReactionsForReply` after, then clear marker on success (best-effort if doc gone). Repeated moderation/delete on deleted replies with pending marker resumes cleanup without changing counts again.
  - **Public visibility/authz:** `listReplies` remains `status=='visible'` + parent readability checks + cursor bound to visible same-post reply; queue/actions remain server-side admin-only.

## Classification / status
- VALID, implemented + hardened pending verification: 1,2,3,4,5,6,7,8
- VALID, implemented + hardened pending behavioral verification (not resolved): A
- VALID, partially mitigated/needs hardening verification: B

## Files modified (current working tree)
- `server/community.ts`, `server/communityStore.ts`, `server/communityValidation.ts`
- `src/shared/community.ts`, `src/lib/communityClient.ts`, `src/hooks/useCommunityReplies.ts`
- `src/components/community/CommunityRepliesSection.tsx`, `src/components/home/QuickTools.tsx`, `src/pages/CommunityModerationPage.tsx`
- `firestore.indexes.json`, `vercel.json`, `coderabbit_fix_progress.md`

## Tests/checks
- `npm run typecheck` (`tsc --noEmit`): PASS
- `git diff --check`: PASS (LF/CRLF warning on `src/pages/CommunityModerationPage.tsx`)
- `npm run build`: not rerun after final moderation UI pagination fix (typecheck passed); prior run failed on a now-fixed unused symbol
- `vercel.json`: valid JSON
- Relevant automated tests: none found

## Remaining limitations / concerns
- #A requires behavioral/runtime verification: queue cursor behavior under concurrent moderation/state changes, Firestore index deployment, admin-only access in deployed env, approve/reject/delete idempotency and count accuracy across races/failures, pending-reply UX consistency, and that no pending/rejected reply leaks publicly.
- Queue pagination covers flagged replies; posts/reports sections remain fixed-limit (existing behavior).
- Multi-document operations not globally atomic; `replyCount`/cleanup rely on transactional state changes + resumable markers but cannot be guaranteed under all failure/race combinations.
- `moderateReply` cleanup marker clear is best-effort if doc missing; reaction cleanup is idempotent but not atomic with moderation state transition.
- #B deletion fence/concurrency mitigated but not formally proven across all races/operations.

## PR #7 Batch 1 - Reaction authorization + account-deletion fence

Scope: CodeRabbit findings #1 and #3 only. **Implemented; compile/static verification only - not marked fully resolved** because Firestore transaction/concurrency behavior was not exercised against an emulator or integration test.

Regression review: reactions originally required only authentication and post/reply visibility, not guidelines acceptance. The initial fence reused `assertMemberCanParticipate` and unintentionally required guidelines; this was corrected by using a deletion-only helper.

### Finding #1 - `toggleReplyReaction` parent-post authorization
- Extracted the existing `listReplies` parent-post visibility rule into shared `assertPostDataReadableForReplies`; both `assertPostReadableForReplies` (used by `listReplies`) and `toggleReplyReaction` now use the same rule.
- `toggleReplyReaction` accepts optional `isAdmin`; `server/community.ts` passes `identity.isAdmin`, matching how `listReplies` is called.
- Inside the reaction transaction, before any writes, the function now reads:
  1. `communityMembers/{uid}`
  2. `communityReplies/{replyId}`
  3. `communityPosts/{postId}`
  4. `communityReplyReactions/{replyId_uid_emoji}`
- Rejects missing/deleted/hidden replies (existing behavior) and replies whose stored `postId` does not match the requested parent post.
- Rejects missing/deleted parent posts, and hidden parent posts unless the caller is an admin or the post author - identical to `listReplies`. Hidden/deleted content is reported as not found.
- Existing reaction toggle, limit, and count-update behavior is unchanged and runs only after authorization succeeds.

### Finding #3 - account-deletion fence
- `toggleReaction` and `toggleReplyReaction` now read the same `communityMembers/{uid}` document inside their Firestore transactions and call the shared `assertMemberNotDeleting` fence before any writes. Post and reply creation still use `assertMemberCanParticipate` (guidelines + deletion).
- `deletionState === 'deleting'` is rejected with the existing 409 `account_deleting` error; no reaction document or reaction count is created, updated, or deleted.
- Missing member documents are not recreated and do not block reactions, matching the original reaction behavior; a missing document has no active deletion fence.
- Because the member read is part of the transaction, a concurrent deletion-fence write causes a Firestore conflict/retry rather than a silent commit.
- Note: reactions remain available without guidelines acceptance, as in the original design. Only the account-deletion fence was added.

### Files modified
- `server/communityStore.ts`
- `server/community.ts`
- `coderabbit_fix_progress.md`

### Verification
- `npm run typecheck`: PASS
- `git diff --check`: PASS
- `npm run build`: PASS
- Manual inspection: deletion-state check is inside both reaction transactions; all transaction reads precede writes; `toggleReplyReaction` checks parent-post authorization.
- Automated tests: none available in the repository (no test framework present). Firestore emulator/runtime behavior was not executed.

### Remaining limitations
- Firestore transaction conflict/retry behavior was not exercised in an emulator or integration test.
- This batch only fences the two reaction operations; other account-deletion races are not claimed to be solved.
- The deletion fence only observes the member document while it exists. Once account cleanup has fully deleted that document, a reaction created afterward is not prevented by this check.
- `toggleReaction` still only permits reactions on `visible` posts (unchanged); hidden-post admins/owners are not granted reaction access there.

## PR #7 Batch 2 - Community data integrity and deletion reliability

Scope: CodeRabbit findings #4-#9 only. Implemented; compile/static verification only - Firestore transaction, emulator, and integration behavior were not executed.

### Finding #4 - completion writes must not recreate deleted documents
- Added `isFirestoreNotFoundError` to recognize only Firestore not-found failures (numeric code 5, string `not-found`, or explicit not-found messages).
- `deleteReply`, `deletePost`, and `moderateReply` now finish reaction/cleanup markers with `update` instead of `set(..., { merge: true })` and ignore only not-found errors. Permission, network, and unexpected failures now propagate.
- Account-deletion post-target completion also uses `update` with not-found-only handling, so a concurrently removed target is not recreated.
- Account-deletion reply count adjustment now uses the transactional `update` on the reply that was read earlier in the same transaction.
- Writes that legitimately create a document (post-deletion markers and target creation) were left unchanged.

### Finding #5 - restoring hidden replies increments the parent count
- `moderateReply` restore now distinguishes already-visible replies, pending/flagged replies, and hidden replies.
- Any non-visible, non-deleted reply that becomes visible increments `replyCount` exactly once in the same transaction.
- Repeated restores find the reply already visible and do not increment again.
- Hidden restores require the parent post to exist and not be deleted; pending approvals keep the existing requirement that the parent post be visible.

### Finding #6 - approving already-visible flagged replies
- Restore on a visible reply now clears `needsReview` without changing `replyCount`.
- Repeated approvals are no-ops once the flag is cleared.
- Pending-to-visible approvals still increment exactly once.

### Finding #7 - reply deletion and count adjustment are atomic
- `deleteReply` decrements the parent count for every previously visible reply (including a visible reply with a stale moderation flag), then marks the reply deleted in the same transaction.
- Account-deletion reply cleanup now re-reads the reply, parent post, and deletion target inside one transaction. It decrements only when the fresh reply is visible, the parent exists and is not deleted, and the parent is not itself an account-deletion target.
- The same transaction marks the reply `deleted`/non-visible and sets the existing `deletionCountAdjusted` marker, so a failed physical delete cannot leave a public reply or double-decrement on retry.
- Reply reaction cleanup markers are preserved; physical reply deletion is retried on the next run.

### Finding #8 - post deletion keeps durable cleanup targets
- `processAccountDeletionPostTargets` no longer swallows `recursiveDelete` failures. The error propagates and the durable target stays pending.
- Targets are marked `post_deleted` and deleted only after artifact cleanup and physical/recursive post deletion succeed.
- Missing posts and already-`post_deleted` targets remain resumable; a retry re-runs bounded, idempotent cleanup.
- Target deletion errors are no longer swallowed, so an incomplete cleanup is retried instead of silently dropping the target.

### Finding #9 - authored-post pagination advances deterministically
- `ensureAccountDeletionTargets` now orders the author query by `FieldPath.documentId()` ascending and applies `startAfter(lastDoc)` on each subsequent page.
- The existing 50-document page bound is preserved; empty and short pages still terminate the loop.
- Document-ID ordering is stable and unique, so pages cannot repeat the same post or skip one.

### Files modified
- `server/communityStore.ts`
- `coderabbit_fix_progress.md`

### Verification
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS (only Git's LF/CRLF advisory warning for this file)
- Manual inspection: Batch 1 reaction fence and parent-post authorization are unchanged; all new transactions complete reads before writes; reply listings filter `status == visible`.
- Automated tests: none available in the repository (no test framework present). Firestore emulator/runtime behavior was not executed.

### Remaining limitations
- Transaction conflict/retry behavior and recursive deletion were not exercised against the Firestore emulator.
- Deletion-marker writes outside a transaction can still race with physical deletion; this batch only converts completion writes to `update` as requested.
- No index change was made. The query orders `__name__` ascending, which matches the default direction of Firestore's automatic `authorId` index, so no manual composite index is expected; this was not verified against a deployed instance.
- The account-deletion reply pass still processes at most 50 replies per query page but re-queries after physical deletion, so it progresses without a cursor.

## PR #7 Batch 2.5 - Firestore indexes, value cursors, and cleanup error propagation

Scope: four additional CodeRabbit findings from the PR #7 review. Implemented; compile/static/JSON verification only - Firestore emulator and integration behavior were not executed.

### Finding #1 - invalid single-field index definitions
- Removed the five single-field entries from `firestore.indexes.json`:
  - `communityReplies.authorId`
  - `communityReactions.userId`
  - `communityReplyReactions.userId`
  - `communityReplyReactions.replyId`
  - `communityReplyReactions.postId`
- Firestore automatically indexes individual fields, so these entries were invalid as composite indexes and are not required by any query.
- Preserved all 10 composite indexes, including the moderation reply queue index (`communityReplies`: `needsReview ASC`, `createdAt DESC`, `__name__ DESC`) and the feed indexes with `__name__` tie-breakers.

### Finding #2 - value-based cursor pagination
- `listReplies` no longer re-reads the cursor document. It decodes `{ t, id }` and applies `startAfter(Timestamp.fromMillis(t), id)` to its `createdAt ASC, __name__ ASC` query.
- `getModerationQueue` uses the same value-based resume for its `needsReview == true`, `createdAt DESC, __name__ DESC` reply query.
- Deleted or moderated cursor replies no longer reset pagination to page 1.
- Malformed or missing cursors still decode to `null` and start from the beginning, matching `listPosts`; page-size bounds and authorization are unchanged.
- `ensureAccountDeletionTargets` still uses its live `startAfter(lastDoc)` snapshot cursor because it orders by document ID only and never re-fetches or revalidates the cursor; it is not affected by the reported state-change issue.

### Finding #3 - swallowed Firestore deletion errors
- Replaced both empty `.catch(() => {})` handlers in `cleanupUserPostReactionsForAccountDeletion` and `cleanupUserReplyReactionsForAccountDeletion`.
- Each now ignores only `isFirestoreNotFoundError(error)` (a concurrent cleanup already removed the document) and rethrows every other failure.
- Failed deletions therefore abort the current cleanup attempt and leave the source document in place for a retry instead of silently looping over it.

### Finding #4 - account-deletion cleanup loops
- Verified the cleanup loops are bounded and make progress: each iteration processes at most 50-100 documents and removes the ones it completes; durable `deletionPostTargets` and `deletionCountAdjusted` markers are written before destructive work.
- Unexpected errors now terminate the cleanup attempt; `deleteMyCommunityData` only deletes the member fence document after every step succeeds, so an interrupted run remains resumable.
- Already-deleted documents remain safe: `delete()` on a missing document is a no-op, and not-found completion writes are explicitly tolerated.
- No additional loop changes were required.

### Files modified
- `firestore.indexes.json`
- `server/communityStore.ts`
- `coderabbit_fix_progress.md`

### Verification
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- `firestore.indexes.json`: valid JSON with 10 composite indexes after removal.
- Automated tests: none available in the repository (no test framework present). Firestore emulator/runtime behavior was not executed.

### Remaining limitations
- Pagination was verified statically only. The value cursors assume `createdAt` values use millisecond precision (`Timestamp.now()` / `Timestamp.fromMillis()`), which is how the application writes them; imported sub-millisecond timestamps were not tested.
- Deletion-error propagation and account-deletion resume behavior were not exercised against the Firestore emulator.
- The moderation reply-queue composite index still requires deployment before the production query can run.
