import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PageHeader, PageShell } from '@/components/PageShell';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CommunityAuthGate } from '@/components/community/CommunityAuthGate';
import { useAuth } from '@/context/AuthContext';
import {
  CommunityApiError,
  getModerationQueue,
  moderatePost,
  moderateReply,
} from '@/lib/communityClient';
import {
  COMMUNITY_REPORT_REASONS,
  type CommunityModerationAction,
  type CommunityModerationPost,
  type CommunityModerationQueue,
} from '@/shared/community';
import { formatRelativeTime } from '@/lib/utils';

function reasonLabel(reason: string): string {
  return (
    COMMUNITY_REPORT_REASONS.find((option) => option.id === reason)?.label ??
    'Other'
  );
}

function RiskBadge({ post }: { post: CommunityModerationPost }) {
  if (post.riskLevel === 'crisis' || post.riskLevel === 'elevated') {
    return <Badge tone="sun">Crisis signal · support first</Badge>;
  }
  if (post.riskLevel === 'watch') {
    return <Badge tone="outline">Watch</Badge>;
  }
  return null;
}

/** Renders the moderator queue and its moderation actions. */
export function CommunityModerationPage() {
  const {
    status: authStatus,
    getIdToken,
    isAdmin,
    refreshAdminAccess,
  } = useAuth();
  const [queue, setQueue] = useState<CommunityModerationQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMoreReplies, setLoadingMoreReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const loadGeneration = useRef(0);
  const appendRequestId = useRef(0);

  /** Loads a fresh moderation queue and supersedes any in-flight append. */
  const load = useCallback(async () => {
    const generation = loadGeneration.current + 1;
    loadGeneration.current = generation;
    // A replacement load supersedes any append that is still in flight.
    appendRequestId.current += 1;
    setLoadingMoreReplies(false);

    if (authStatus !== 'ready' || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const result = await getModerationQueue(token);
      if (loadGeneration.current !== generation) return;
      setQueue(result);
      setForbidden(false);
    } catch (cause) {
      if (loadGeneration.current !== generation) return;
      if (
        cause instanceof CommunityApiError &&
        (cause.status === 403 || cause.status === 401)
      ) {
        setForbidden(true);
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : 'The moderation queue could not be loaded.',
        );
      }
    } finally {
      if (loadGeneration.current === generation) {
        setLoading(false);
      }
    }
  }, [authStatus, getIdToken, isAdmin]);

  /** Appends the next flagged-reply page only while its load generation is current. */
  const loadMoreReplies = useCallback(async () => {
    if (
      authStatus !== 'ready' ||
      !isAdmin ||
      !queue?.repliesNextCursor ||
      loadingMoreReplies
    ) {
      return;
    }

    setLoadingMoreReplies(true);
    setError(null);
    const generation = loadGeneration.current;
    const currentAppend = appendRequestId.current + 1;
    appendRequestId.current = currentAppend;
    try {
      const token = await getIdToken();
      const result = await getModerationQueue(token, {
        repliesCursor: queue.repliesNextCursor,
      });
      if (
        loadGeneration.current !== generation ||
        appendRequestId.current !== currentAppend
      ) {
        return;
      }
      setQueue((prev) =>
        prev
          ? {
              ...prev,
              replies: [
                ...prev.replies,
                ...result.replies.filter(
                  (reply) => !prev.replies.some((existing) => existing.id === reply.id),
                ),
              ],
              repliesNextCursor: result.repliesNextCursor,
            }
          : result,
      );
    } catch (cause) {
      if (
        loadGeneration.current !== generation ||
        appendRequestId.current !== currentAppend
      ) {
        return;
      }
      if (
        cause instanceof CommunityApiError &&
        (cause.status === 403 || cause.status === 401)
      ) {
        setForbidden(true);
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : 'More flagged replies could not be loaded.',
        );
      }
    } finally {
      if (
        loadGeneration.current === generation &&
        appendRequestId.current === currentAppend
      ) {
        setLoadingMoreReplies(false);
      }
    }
  }, [authStatus, getIdToken, isAdmin, loadingMoreReplies, queue]);

  useEffect(() => {
    void load();
  }, [load]);

  const checkAccess = async () => {
    setCheckingAccess(true);
    setError(null);
    setForbidden(false);
    try {
      const admin = await refreshAdminAccess();
      if (!admin) {
        setError(
          'This account still does not have the admin custom claim. Ask a moderator to grant it, then check again.',
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Moderator access could not be refreshed.',
      );
    } finally {
      setCheckingAccess(false);
    }
  };

  const act = async (
    postId: string,
    action: CommunityModerationAction,
  ) => {
    setBusyId(postId);
    setError(null);
    try {
      const token = await getIdToken();
      await moderatePost({ postId, action }, token);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The moderation action failed.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const actReply = async (
    postId: string,
    replyId: string,
    action: CommunityModerationAction,
  ) => {
    setBusyId(replyId);
    setError(null);
    try {
      const token = await getIdToken();
      await moderateReply({ postId, replyId, action }, token);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The moderation action failed.',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Moderator view"
        title="Community moderation"
        subtitle="Review reports and flagged posts. Crisis signals are here so someone can offer support, never so a post can be punished for distress."
        action={
          <Link
            to="/community"
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to feed
          </Link>
        }
      />

      <CommunityAuthGate>
        {authStatus === 'ready' && !isAdmin ? (
          <div className="rounded-[1.8rem] border border-pine-900/10 bg-white/65 px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft text-clay">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-pine-950">
              Moderator access required
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              This page is only available to accounts with the{' '}
              <code className="rounded bg-pine-100 px-1 py-0.5 text-[0.72rem] text-pine-800">
                admin
              </code>{' '}
              custom claim. If a moderator just granted you access, check again
              to refresh your session.
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => void checkAccess()}
              disabled={checkingAccess}
            >
              {checkingAccess ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              {checkingAccess ? 'Checking access.' : 'Check access again'}
            </Button>
            {error ? (
              <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-clay">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pine-900/8 bg-white/60 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted">
                <ShieldCheck className="h-4 w-4 text-pine-700" aria-hidden="true" />
                Moderator view exposes private risk signals. Do not share what
                you see here.
              </p>
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Refresh
              </Button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-clay/20 bg-clay-soft/70 px-4 py-3 text-sm text-clay">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[16rem] items-center justify-center rounded-[1.8rem] border border-pine-900/8 bg-white/55">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Loading the queue
                </p>
              </div>
            ) : forbidden ? (
              <div className="rounded-2xl border border-clay/20 bg-clay-soft/70 px-4 py-3 text-sm text-clay">
                <p>
                  The server rejected moderator access for this session. If a
                  moderator just granted you access, refresh your session.
                </p>
                <Button
                  className="mt-3"
                  variant="secondary"
                  size="sm"
                  onClick={() => void checkAccess()}
                  disabled={checkingAccess}
                >
                  {checkingAccess ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {checkingAccess ? 'Checking access.' : 'Check access again'}
                </Button>
              </div>
            ) : queue ? (
              <>
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold text-pine-950">
                      Open reports
                    </h2>
                    <Badge tone="clay">{queue.reports.length} open</Badge>
                  </div>
                  {queue.reports.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-pine-900/12 bg-white/50 px-4 py-6 text-sm text-muted">
                      No open reports right now.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {queue.reports.map((report) => (
                        <div
                          key={report.id}
                          className="rounded-2xl border border-pine-900/8 bg-white/70 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-clay">
                              <Flag className="h-3 w-3" aria-hidden="true" />
                              {reasonLabel(report.reason)}
                            </span>
                            <span className="text-[0.66rem] text-muted">
                              {formatRelativeTime(report.createdAt)}
                            </span>
                          </div>
                          {report.description ? (
                            <p className="mt-2 text-sm leading-relaxed text-ink/85">
                              {report.description}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs italic text-muted">
                              No extra details were provided.
                            </p>
                          )}
                          <Link
                            to={`/community/${report.postId}`}
                            className="mt-2 inline-block text-xs font-bold text-pine-800 underline underline-offset-2"
                          >
                            Open reported post
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold text-pine-950">
                      Flagged replies
                    </h2>
                    <Badge tone="sun">{queue.replies.length} replies</Badge>
                  </div>
                  {queue.replies.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-pine-900/12 bg-white/50 px-4 py-6 text-sm text-muted">
                      No replies are waiting for review.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {queue.replies.map((reply) => (
                        <article
                          key={reply.id}
                          className="rounded-2xl border border-pine-900/8 bg-white/75 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={reply.status === 'visible' ? 'pine' : 'clay'}
                            >
                              {reply.status === 'hidden'
                                ? 'Pending review'
                                : reply.status === 'deleted'
                                  ? 'Deleted'
                                  : 'Visible'}
                            </Badge>
                            {reply.riskLevel === 'crisis' ||
                            reply.riskLevel === 'elevated' ? (
                              <Badge tone="sun">Crisis signal · support first</Badge>
                            ) : reply.riskLevel === 'watch' ? (
                              <Badge tone="outline">Watch</Badge>
                            ) : null}
                            <span className="ml-auto text-[0.66rem] text-muted">
                              {formatRelativeTime(reply.createdAt)}
                            </span>
                          </div>

                          <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink/85">
                            {reply.content}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-pine-900/6 pt-3">
                            <Link
                              to={`/community/${reply.postId}`}
                              className="mr-auto text-xs font-bold text-pine-800 underline underline-offset-2"
                            >
                              Open parent post
                            </Link>
                            {reply.status !== 'deleted' ? (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={busyId === reply.id}
                                  onClick={() =>
                                    void actReply(reply.postId, reply.id, 'restore')
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={busyId === reply.id}
                                  onClick={() =>
                                    void actReply(reply.postId, reply.id, 'hide')
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Reject
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </article>
                      ))}
                      {queue.repliesNextCursor ? (
                        <div className="flex justify-center pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void loadMoreReplies()}
                            disabled={loadingMoreReplies}
                          >
                            {loadingMoreReplies ? (
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            ) : null}
                            {loadingMoreReplies
                              ? 'Loading more replies…'
                              : 'Load more flagged replies'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold text-pine-950">
                      Flagged and hidden posts
                    </h2>
                    <Badge tone="sun">{queue.posts.length} posts</Badge>
                  </div>
                  {queue.posts.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-pine-900/12 bg-white/50 px-4 py-6 text-sm text-muted">
                      Nothing is waiting for review.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {queue.posts.map((post) => (
                        <article
                          key={post.id}
                          className="rounded-2xl border border-pine-900/8 bg-white/75 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={
                                post.status === 'visible' ? 'pine' : 'clay'
                              }
                            >
                              {post.status === 'hidden'
                                ? 'Hidden'
                                : post.status === 'deleted'
                                  ? 'Deleted'
                                  : 'Visible'}
                            </Badge>
                            {post.status !== 'deleted' ? (
                              <RiskBadge post={post} />
                            ) : null}
                            {post.reportCount > 0 ? (
                              <Badge tone="outline">
                                {post.reportCount} reports
                              </Badge>
                            ) : null}
                            <span className="ml-auto text-[0.66rem] text-muted">
                              {formatRelativeTime(post.createdAt)}
                            </span>
                          </div>

                          {post.title ? (
                            <h3 className="mt-2.5 font-display text-lg font-semibold text-pine-950">
                              {post.title}
                            </h3>
                          ) : null}
                          <p className="mt-1.5 max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink/85">
                            {post.content}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-pine-900/6 pt-3">
                            {post.status === 'deleted' ? (
                              <span className="mr-auto text-xs italic text-muted">
                                The author deleted this post. Only the reports
                                remain.
                              </span>
                            ) : (
                              <Link
                                to={`/community/${post.id}`}
                                className="mr-auto text-xs font-bold text-pine-800 underline underline-offset-2"
                              >
                                Open post
                              </Link>
                            )}
                            {post.status === 'hidden' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busyId === post.id}
                                onClick={() => void act(post.id, 'restore')}
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                Restore
                              </Button>
                            ) : post.status === 'visible' ? (
                              <Button
                                variant="danger"
                                size="sm"
                                disabled={busyId === post.id}
                                onClick={() => void act(post.id, 'hide')}
                              >
                                <EyeOff
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                Hide
                              </Button>
                            ) : null}
                            {post.needsReview || post.reportCount > 0 ? (
                              <Button
                                variant="soft"
                                size="sm"
                                disabled={busyId === post.id}
                                onClick={() =>
                                  void act(post.id, 'dismiss-reports')
                                }
                              >
                                <Check
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {post.reportCount > 0
                                  ? 'Dismiss reports'
                                  : 'Clear flag'}
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </div>
        )}
      </CommunityAuthGate>
    </PageShell>
  );
}
