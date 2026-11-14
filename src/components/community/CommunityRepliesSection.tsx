import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  HeartHandshake,
  Loader2,
  MessageCircle,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CrisisSupportNote } from '@/components/community/CrisisSupportNote';
import { CommunityGuidelinesModal } from '@/components/community/CommunityGuidelinesModal';
import { ReplyEmojiReactions } from '@/components/community/ReplyEmojiReactions';
import { useAuth } from '@/context/AuthContext';
import {
  acceptGuidelines as acceptGuidelinesRequest,
  CommunityApiError,
  createReply as createReplyRequest,
  deleteReply as deleteReplyRequest,
  editReply as editReplyRequest,
} from '@/lib/communityClient';
import { COMMUNITY_LIMITS, type CommunityReply } from '@/shared/community';
import { formatRelativeTime } from '@/lib/utils';
import { useCommunityReplies } from '@/hooks/useCommunityReplies';

interface CommunityRepliesSectionProps {
  postId: string;
  onReplyCountChange?: (delta: number) => void;
}

/** Renders the reply composer and list for one community post. */
export function CommunityRepliesSection({
  postId,
  onReplyCountChange,
}: CommunityRepliesSectionProps) {
  const { getIdToken } = useAuth();
  const {
    replies,
    loading,
    loadingMore,
    hasMore,
    error: listError,
    refresh,
    loadMore,
    addReply,
    removeReply,
    updateReplyReactions,
    setReplies,
  } = useCommunityReplies(postId);

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsGuidelines, setNeedsGuidelines] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [acceptingGuidelines, setAcceptingGuidelines] = useState(false);
  const [supportSuggested, setSupportSuggested] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  /** Publishes the composed reply, handling review and guidelines states. */
  const submitReply = async (tokenOverride?: string) => {
    const trimmed = content.trim();
    if (!trimmed || needsGuidelines) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitInfo(null);
    setSupportSuggested(false);

    try {
      const token = tokenOverride ?? (await getIdToken());
      const result = await createReplyRequest(
        { postId, content: trimmed },
        token,
      );

      setContent('');
      if (result.pendingReview) {
        setSubmitInfo(
          'Thanks for sharing. Your reply was submitted for review and will appear once it is approved.',
        );
      } else {
        addReply(result.reply);
        onReplyCountChange?.(1);
      }

      if (result.supportSuggested) {
        setSupportSuggested(true);
      }
    } catch (cause) {
      if (
        cause instanceof CommunityApiError &&
        cause.code === 'guidelines_required'
      ) {
        setNeedsGuidelines(true);
        setGuidelinesOpen(true);
        setSubmitError(
          'Please read and accept the community guidelines before posting your first reply.',
        );
      } else if (
        cause instanceof CommunityApiError &&
        cause.code === 'content_blocked'
      ) {
        setSubmitError(cause.message);
      } else {
        setSubmitError(
          cause instanceof Error
            ? cause.message
            : 'Your reply could not be published right now.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Submits the reply form, reopening guidelines when acceptance is required. */
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (needsGuidelines) {
      setSubmitError(
        'Please read and accept the community guidelines before posting your first reply.',
      );
      setGuidelinesOpen(true);
      return;
    }
    void submitReply();
  };

  /** Records guideline acceptance without automatically submitting the reply. */
  const handleAcceptGuidelines = async () => {
    setAcceptingGuidelines(true);
    setSubmitError(null);
    try {
      const token = await getIdToken();
      await acceptGuidelinesRequest(token);
      setNeedsGuidelines(false);
      setGuidelinesOpen(false);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : 'Could not accept guidelines. Please try again.',
      );
    } finally {
      setAcceptingGuidelines(false);
    }
  };

  const handleDelete = async (reply: CommunityReply) => {
    if (
      !window.confirm(
        'Delete your reply? It will be removed from this discussion and cannot be restored.',
      )
    ) {
      return;
    }

    setDeletingId(reply.id);
    setDeleteError(null);
    try {
      const token = await getIdToken();
      await deleteReplyRequest(reply.id, token);
      removeReply(reply.id);
      onReplyCountChange?.(-1);
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : 'The reply could not be deleted.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const startEditReply = (reply: CommunityReply) => {
    setEditingId(reply.id);
    setEditContent(reply.content);
    setEditError(null);
  };

  const cancelEditReply = () => {
    setEditingId(null);
    setEditContent('');
    setEditError(null);
  };

  const saveEditReply = async (reply: CommunityReply) => {
    setSavingEditId(reply.id);
    setEditError(null);
    try {
      const token = await getIdToken();
      const result = await editReplyRequest(
        { replyId: reply.id, content: editContent.trim() },
        token,
      );
      setReplies((prev) =>
        prev.map((r) => (r.id === reply.id ? result.reply : r)),
      );
      setEditingId(null);
      setEditContent('');
    } catch (cause) {
      setEditError(
        cause instanceof Error ? cause.message : 'The reply could not be updated.',
      );
    } finally {
      setSavingEditId(null);
    }
  };

  const remainingChars = COMMUNITY_LIMITS.replyContent - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <section className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pine-900/8 pb-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-pine-950">
          <MessageCircle className="h-5 w-5 text-pine-700" aria-hidden="true" />
          Replies
          <span className="rounded-full bg-pine-100 px-2 py-0.5 text-xs font-bold text-pine-700">
            {replies.length}
          </span>
        </h2>
        <span className="text-xs text-muted">Safe & anonymous discussion</span>
      </div>

      {/* Composer Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[1.6rem] border border-pine-900/10 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(7,37,28,.4)] sm:p-5"
      >
        <div className="flex items-center justify-between gap-2 border-b border-pine-900/8 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine-100 text-[0.66rem] font-extrabold text-pine-700">
              A
            </span>
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-pine-800">
              Replying as Anonymous friend
            </span>
          </div>
          <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-pine-600" aria-hidden="true" />
            Identity protected
          </span>
        </div>

        <div className="mt-3">
          <label htmlFor="reply-composer-textarea" className="sr-only">
            Write an anonymous reply
          </label>
          <textarea
            id="reply-composer-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a supportive, kind reply… Disagree with the thought, not the person."
            rows={3}
            disabled={submitting || acceptingGuidelines}
            className="w-full resize-none rounded-xl border border-pine-900/10 bg-white/90 p-3 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-200"
          />
        </div>

        {submitInfo ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-pine-50 px-3 py-2 text-xs font-semibold text-pine-800">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>{submitInfo}</p>
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-clay-soft px-3 py-2 text-xs font-semibold text-clay">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p>{submitError}</p>
              {needsGuidelines ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setGuidelinesOpen(true)}
                  >
                    Read guidelines
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => void handleAcceptGuidelines()}
                    disabled={acceptingGuidelines}
                  >
                    {acceptingGuidelines ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {acceptingGuidelines
                      ? 'Accepting guidelines…'
                      : 'I agree to the Community Guidelines'}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {supportSuggested ? (
          <div className="mt-3">
            <CrisisSupportNote />
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
          <span
            className={`text-[0.68rem] font-medium ${
              isOverLimit ? 'font-bold text-clay' : 'text-muted'
            }`}
          >
            {content.length.toLocaleString()} / {COMMUNITY_LIMITS.replyContent.toLocaleString()}
          </span>

          <Button
            type="submit"
            size="sm"
            disabled={
              submitting ||
              acceptingGuidelines ||
              !content.trim() ||
              isOverLimit ||
              needsGuidelines
            }
          >
            {submitting || acceptingGuidelines ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {submitting ? 'Posting reply…' : 'Post reply'}
          </Button>
        </div>
      </form>

      <CommunityGuidelinesModal
        open={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
      />

      {/* Delete error notification */}
      {deleteError ? (
        <div className="rounded-xl bg-clay-soft px-3 py-2 text-xs font-semibold text-clay">
          {deleteError}
        </div>
      ) : null}

      {/* Reply List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="animate-pulse rounded-2xl border border-pine-900/8 bg-white/60 p-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-pine-100" />
                <div className="h-3 w-20 rounded bg-pine-100" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3.5 w-full rounded bg-pine-100/60" />
                <div className="h-3.5 w-3/4 rounded bg-pine-100/60" />
              </div>
            </div>
          ))}
        </div>
      ) : listError ? (
        <div className="rounded-2xl border border-clay/20 bg-clay-soft/70 p-4 text-center text-sm text-clay">
          <p className="font-semibold">{listError}</p>
          <Button variant="secondary" size="sm" onClick={refresh} className="mt-3">
            Try loading replies again
          </Button>
        </div>
      ) : replies.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-pine-900/15 bg-white/40 p-8 text-center">
          <p className="font-display text-sm font-semibold text-pine-900">
            No replies yet
          </p>
          <p className="mt-1 text-xs text-muted">
            Be the first to share an encouraging word or let them know they are not alone.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {replies.map((reply) => {
            const isDeleting = deletingId === reply.id;

            return (
              <article
                key={reply.id}
                className="group rounded-2xl border border-pine-900/8 bg-white/70 p-4 transition hover:bg-white/90 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pine-100 text-[0.62rem] font-extrabold text-pine-700">
                      A
                    </span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted">
                      Anonymous friend
                    </span>
                    {reply.isMine ? (
                      <span className="rounded-full bg-pine-100 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-pine-700">
                        Your reply
                      </span>
                    ) : null}
                  </div>

                  <span className="text-[0.64rem] font-semibold text-muted">
                    {formatRelativeTime(reply.createdAt)}
                  </span>
                </div>

                {editingId === reply.id ? (
                  <div className="mt-2.5 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      maxLength={COMMUNITY_LIMITS.replyContent}
                      className="w-full resize-y rounded-xl border border-pine-900/10 bg-white/90 p-3 text-sm leading-relaxed text-ink focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-200"
                    />
                    {editError ? (
                      <p className="rounded-xl bg-clay-soft px-3 py-2 text-xs font-semibold text-clay">
                        {editError}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void saveEditReply(reply)}
                        disabled={savingEditId === reply.id || !editContent.trim()}
                      >
                        {savingEditId === reply.id ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={cancelEditReply}
                        disabled={savingEditId === reply.id}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-ink/90">
                    {reply.content}
                  </p>
                )}

                {/* Reply emoji reactions & self-deletion */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-pine-900/6 pt-2">
                  <ReplyEmojiReactions
                    postId={postId}
                    replyId={reply.id}
                    counts={reply.reactionCounts}
                    myReactions={reply.myReactions}
                    onReactionChange={(nextCounts, nextMyReactions) =>
                      updateReplyReactions(reply.id, nextCounts, nextMyReactions)
                    }
                  />

                  {reply.isMine ? (
                    <div className="ml-auto flex gap-2">
                      {editingId !== reply.id ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startEditReply(reply)}
                          className="text-xs"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => void handleDelete(reply)}
                        disabled={isDeleting || editingId === reply.id}
                        className="text-xs"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                        )}
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                {loadingMore ? 'Loading more replies…' : 'Load more replies'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
