# CodeRabbit Fix Progress — Community Reply System (PR #6)

## Scope
Findings 1-8 + A (reply moderation queue) + B (concurrent deletion/reply creation).

## Batch 1 (implemented, pending verification)
- #1 Reply reads bypass parent-post authorization — **implemented**: `listReplies` enforces server-side parent-post existence/visibility before returning replies.
- #2 Unbounded reply reads — **implemented**: Firestore `postId+status=='visible'` filter, ordered, limit/cursor pagination (`nextCursor`), API/client/hook/UI “Load more”.

## Batch 2 (implemented + hardened, pending verification)
- #3 Post deletion cleanup not retryable — **implemented**: resumable/idempotent `cleanupPostArtifacts`, `cleanupPending` marker, retry allowed while cleanup pending.
- #4 Account deletion loses cleanup targets — **implemented**: fence + durable per-post targets in `communityMembers/{uid}/deletionPostTargets`, legacy array migration, bounded/paginated recording/processing, member cleared only on completion.
- B Concurrent account erasure and reply creation — **partially mitigated**: `deletionState==='deleting'` checked in participation/rate-limit/create paths with fence lifecycle; not formally proven across all races/ops.
- Hardening: per-source `deletionCountAdjusted` markers make count adjustments recoverable and idempotent before source deletion.

## Batch 3 (implemented, pending verification)
- #5 Explicit Community Guidelines acceptance — **implemented**: no auto-accept on “Post reply”; guidelines shown, explicit server-persisted acceptance action required, submission blocked until accepted then user retries post.
- #6 StrictMode sessionStorage inconsistency — **implemented**: pure initializer, storage write moved to `useEffect` with safe try/catch.
- #7 Stale reply loads overwrite successful mutations — **implemented**: mutations invalidate in-flight loads via requestId bump; append/dedupe and cursor handling preserved.

## Batch 4A (implemented, pending deployment verification)
- #8 Immutable caching of SPA fallback HTML — **implemented**: `vercel.json` rewrite narrowed to exclude `/assets/` and `/api/`; asset immutable caching preserved.

## Batch 4B (implemented + hardened, pending behavioral verification; **not marked resolved**)
- #A Reply moderation queue/actions — **implemented**:
  - **Queue pagination/ordering:** admin-only `GET moderation` accepts bounded `repliesCursor`/`repliesLimit` (validated). `getModerationQueue` queries `REPLIES where needsReview==true orderBy(createdAt desc, __name__ desc)` with `limit+1`, resumes only from a cursor doc that exists and still `needsReview` (non-deleted), filters defensively, returns `replies` page + `repliesNextCursor`. Added replies index `(needsReview, createdAt desc, __name__ desc)` in `firestore.indexes.json`. Posts/reports behavior preserved.
  - **Pending reply client behavior:** create-reply response includes `pendingReview` (server-screened). Client/UI: pending replies are not added to public list and do not increment public reply count; user sees “submitted for review…” feedback (anonymous, no moderation internals). Publicly visible replies continue to be added and count incremented normally.
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
