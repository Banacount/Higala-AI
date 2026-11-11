import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PageShell, SafetyFooter } from '@/components/PageShell';
import { Button, buttonStyles } from '@/components/ui/Button';
import { CategoryChip } from '@/components/community/CategoryChip';
import { CommunityAuthGate } from '@/components/community/CommunityAuthGate';
import { CrisisSupportNote } from '@/components/community/CrisisSupportNote';
import { PostSkeleton } from '@/components/community/PostSkeleton';
import { ReportDialog } from '@/components/community/ReportDialog';
import { SupportiveReactions } from '@/components/community/SupportiveReactions';
import { CommunityRepliesSection } from '@/components/community/CommunityRepliesSection';
import { useAuth } from '@/context/AuthContext';
import { useCommunityPost } from '@/hooks/useCommunityPost';
import {
  deletePost as deletePostRequest,
} from '@/lib/communityClient';
import { formatRelativeTime } from '@/lib/utils';

interface PostLocationState {
  justPublished?: boolean;
  supportSuggested?: boolean;
}

export function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getIdToken } = useAuth();
  const { post, loading, error, notFound, refresh, setPost } =
    useCommunityPost(postId);

  const state = (location.state ?? {}) as PostLocationState;
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async () => {
    if (!post) return;
    if (
      !window.confirm(
        'Delete this post? It will disappear from the community and cannot be restored.',
      )
    ) {
      return;
    }

    setDeleting(true);
    setActionError(null);
    try {
      const token = await getIdToken();
      await deletePostRequest(post.id, token);
      navigate('/community', { replace: true });
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'The post could not be deleted.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <Link
          to="/community"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.13em] text-muted transition hover:text-pine-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Anonymous Sharing
        </Link>

        <CommunityAuthGate>
          {loading ? (
            <div className="mt-4">
              <PostSkeleton />
            </div>
          ) : notFound ? (
            <div className="mt-4 rounded-[1.8rem] border border-dashed border-pine-900/15 bg-white/60 px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-100 text-pine-700">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-pine-950">
                This post is not available
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                It may have been deleted by its author or hidden after a
                moderation review. The rest of the community is still here.
              </p>
              <Link
                to="/community"
                className={`${buttonStyles({ size: 'md' })} mt-5`}
              >
                Return to the feed
              </Link>
            </div>
          ) : error ? (
            <div className="mt-4 rounded-2xl border border-clay/20 bg-clay-soft/70 px-4 py-3 text-sm text-clay">
              <p className="font-semibold">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={refresh}
              >
                Try again
              </Button>
            </div>
          ) : post ? (
            <div className="mt-4">
              {state.justPublished ? (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-pine-200 bg-pine-50 px-4 py-3 text-sm text-pine-800">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    Your post is live. Only the label{' '}
                    <strong>Anonymous</strong> is shown to everyone else.
                  </p>
                </div>
              ) : null}

              {state.supportSuggested ? (
                <CrisisSupportNote className="mb-4" />
              ) : null}

              <article className="rounded-[1.8rem] border border-pine-900/10 bg-white/80 p-5 shadow-[0_22px_48px_-40px_rgba(7,37,28,.55)] sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryChip category={post.category} />
                    {post.isMine ? (
                      <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-pine-600">
                        Your post
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[0.68rem] font-semibold text-muted">
                    {formatRelativeTime(post.createdAt)}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine-100 text-[0.66rem] font-extrabold text-pine-700">
                    A
                  </span>
                  <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
                    Anonymous
                  </span>
                </div>

                {post.title ? (
                  <h1 className="mt-3 font-display text-2xl font-semibold leading-tight text-pine-950 sm:text-[1.9rem]">
                    {post.title}
                  </h1>
                ) : null}

                <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-[1.75] text-ink/90">
                  {post.content}
                </p>

                {/* Supportive reactions */}
                <div className="mt-6 border-t border-pine-900/8 pt-4">
                  <p className="mb-2.5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-pine-700">
                    Supportive reactions
                  </p>
                  <SupportiveReactions
                    postId={post.id}
                    counts={post.reactionCounts}
                    myReactions={post.myReactions ?? []}
                    onReactionChange={(nextCounts, nextMyReactions) => {
                      setPost((prev) =>
                        prev
                          ? {
                              ...prev,
                              reactionCounts: nextCounts,
                              myReactions: nextMyReactions,
                            }
                          : prev,
                      );
                    }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-pine-900/8 pt-4">
                  <span className="mr-auto flex items-center gap-1.5 text-[0.68rem] font-semibold text-muted">
                    <MessageCircle
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    {post.replyCount}{' '}
                    {post.replyCount === 1 ? 'reply' : 'replies'}
                  </span>

                  {post.isMine ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void remove()}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {deleting ? 'Deleting…' : 'Delete my post'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setReportOpen(true)}
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      Report
                    </Button>
                  )}
                </div>

                {actionError ? (
                  <p className="mt-3 rounded-xl bg-clay-soft px-3 py-2 text-xs font-semibold text-clay">
                    {actionError}
                  </p>
                ) : null}
              </article>

              <CommunityRepliesSection
                postId={post.id}
                onReplyCountChange={(delta) => {
                  setPost((prev) =>
                    prev
                      ? {
                          ...prev,
                          replyCount: Math.max(0, prev.replyCount + delta),
                        }
                      : prev,
                  );
                }}
              />

              <SafetyFooter />
            </div>
          ) : null}
        </CommunityAuthGate>
      </div>

      {post ? (
        <ReportDialog
          open={reportOpen}
          postId={post.id}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </PageShell>
  );
}
