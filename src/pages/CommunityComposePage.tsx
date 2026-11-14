import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Feather,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader, PageShell, SafetyFooter } from '@/components/PageShell';
import { Button, buttonStyles } from '@/components/ui/Button';
import { AnonymousNotice } from '@/components/community/AnonymousNotice';
import { CommunityAuthGate } from '@/components/community/CommunityAuthGate';
import { CrisisSupportNote } from '@/components/community/CrisisSupportNote';
import { useAuth } from '@/context/AuthContext';
import {
  acceptGuidelines as acceptGuidelinesRequest,
  CommunityApiError,
  createPost as createPostRequest,
  getMyCommunityState,
} from '@/lib/communityClient';
import { screenText } from '@/shared/safety';
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_LIMITS,
  type CommunityCategory,
  type CommunityMe,
} from '@/shared/community';
import { COMMUNITY_GUIDELINES } from '@/shared/communityGuidelines';

function GuidelinesGate({
  accepting,
  error,
  onAccept,
}: {
  accepting: boolean;
  error: string | null;
  onAccept: () => void;
}) {
  return (
    <div className="rounded-[1.8rem] border border-pine-900/10 bg-white/70 p-5 sm:p-7 dark:border-white/10 dark:bg-[#0e221b]/90">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pine-100 text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-pine-700 dark:text-pine-300">
            Before your first post
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-pine-950 dark:text-cream">
            Read this like a promise to each other
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted dark:text-pine-200/70">
            This community only works if we protect each other. Please read the
            guidelines before publishing.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {COMMUNITY_GUIDELINES.map((guideline, index) => (
          <li
            key={guideline.title}
            className="flex items-start gap-3 rounded-2xl border border-pine-900/6 bg-cream/60 p-4 dark:border-white/10 dark:bg-pine-950/60"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine-100 text-[0.62rem] font-extrabold text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-bold text-pine-950 dark:text-cream">
                {guideline.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted dark:text-pine-200/70">
                {guideline.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="mt-4 rounded-xl bg-clay-soft px-3 py-2 text-xs font-semibold text-clay dark:bg-clay/20 dark:text-[#f6b8a0]">
          {error}
        </p>
      ) : null}

      <Button
        onClick={onAccept}
        disabled={accepting}
        className="mt-5 w-full sm:w-auto"
      >
        {accepting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="h-4 w-4" aria-hidden="true" />
        )}
        {accepting ? 'Saving…' : 'I understand and agree'}
      </Button>
      <p className="mt-3 text-[0.66rem] leading-relaxed text-muted/80 dark:text-pine-200/60">
        You only need to do this once. It is stored against a private anonymous
        account, not a public profile.
      </p>
    </div>
  );
}

export function CommunityComposePage() {
  const navigate = useNavigate();
  const { status: authStatus, getIdToken } = useAuth();
  const [me, setMe] = useState<CommunityMe | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== 'ready') return;
    let cancelled = false;
    setMeLoading(true);
    void (async () => {
      try {
        const token = await getIdToken();
        const state = await getMyCommunityState(token);
        if (!cancelled) {
          setMe(state);
          setMeError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setMeError(
            cause instanceof Error
              ? cause.message
              : 'Your community settings could not be loaded.',
          );
        }
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, getIdToken]);

  const accept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const token = await getIdToken();
      const result = await acceptGuidelinesRequest(token);
      setMe(result.me);
    } catch (cause) {
      setAcceptError(
        cause instanceof Error
          ? cause.message
          : 'The guidelines could not be saved.',
      );
    } finally {
      setAccepting(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = await getIdToken();
      const result = await createPostRequest(
        { title: title.trim(), content: content.trim(), category },
        token,
      );
      navigate(`/community/${result.post.id}`, {
        state: {
          justPublished: true,
          supportSuggested: result.supportSuggested,
        },
      });
    } catch (cause) {
      if (
        cause instanceof CommunityApiError &&
        cause.code === 'guidelines_required'
      ) {
        setMe({ guidelinesAcceptedAt: null });
      }
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your post could not be published.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const risk = screenText(content).level;
  const showSupport = risk === 'elevated' || risk === 'crisis';
  const accepted = Boolean(me?.guidelinesAcceptedAt);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Community"
        title="Share your thoughts"
        subtitle="You do not need a perfect story or the right words. Say it the way it sits in your chest."
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

      <div className="mx-auto max-w-3xl">
        <CommunityAuthGate>
          {meLoading ? (
            <div className="flex min-h-[18rem] items-center justify-center rounded-[1.8rem] border border-pine-900/8 bg-white/55 dark:border-white/10 dark:bg-[#0e221b]/80">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted dark:text-pine-200/70">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Preparing your space
              </p>
            </div>
          ) : meError ? (
            <div className="rounded-2xl border border-clay/20 bg-clay-soft/70 px-4 py-3 text-sm text-clay dark:border-clay/30 dark:bg-clay/15 dark:text-[#f6b8a0]">
              {meError}
            </div>
          ) : !accepted ? (
            <GuidelinesGate
              accepting={accepting}
              error={acceptError}
              onAccept={() => void accept()}
            />
          ) : (
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <AnonymousNotice />

              <div className="rounded-[1.8rem] border border-pine-900/10 bg-white/75 p-5 sm:p-6 dark:border-white/10 dark:bg-[#0e221b]/90">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-100 px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.13em] text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Posting as Anonymous
                  </span>
                  <span className="text-[0.62rem] font-semibold text-muted dark:text-pine-200/65">
                    {content.length.toLocaleString()} /{' '}
                    {COMMUNITY_LIMITS.content.toLocaleString()}
                  </span>
                </div>

                <label className="mt-4 block">
                  <span className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-pine-700 dark:text-pine-300">
                    Title (optional)
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={COMMUNITY_LIMITS.title}
                    placeholder="A few words, if you want one"
                    className="mt-2 w-full rounded-2xl border border-pine-900/12 bg-cream/50 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/65 focus:border-pine-600/50 focus:ring-2 focus:ring-pine-200 dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:ring-pine-500/25"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-pine-700 dark:text-pine-300">
                    What is on your mind?
                  </span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={COMMUNITY_LIMITS.content}
                    rows={9}
                    required
                    placeholder="You can write in English, Bisaya, Filipino, or a mix. Take your time."
                    className="mt-2 w-full resize-y rounded-2xl border border-pine-900/12 bg-cream/50 px-4 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/65 focus:border-pine-600/50 focus:ring-2 focus:ring-pine-200 dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:ring-pine-500/25"
                  />
                </label>

                <fieldset className="mt-4">
                  <legend className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-pine-700 dark:text-pine-300">
                    Category (optional)
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={category === null}
                      onClick={() => setCategory(null)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        category === null
                          ? 'bg-pine-900 text-cream dark:bg-pine-500 dark:text-pine-950'
                          : 'border border-pine-900/10 bg-white/70 text-muted hover:text-pine-900 dark:border-white/10 dark:bg-pine-950/60 dark:text-pine-200/75 dark:hover:text-cream'
                      }`}
                    >
                      No category
                    </button>
                    {COMMUNITY_CATEGORIES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={category === option.id}
                        onClick={() => setCategory(option.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          category === option.id
                            ? 'bg-pine-900 text-cream dark:bg-pine-500 dark:text-pine-950'
                            : 'border border-pine-900/10 bg-white/70 text-muted hover:text-pine-900 dark:border-white/10 dark:bg-pine-950/60 dark:text-pine-200/75 dark:hover:text-cream'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              {showSupport ? <CrisisSupportNote /> : null}

              {error ? (
                <div className="rounded-2xl border border-clay/20 bg-clay-soft/70 px-4 py-3 text-sm text-clay dark:border-clay/30 dark:bg-clay/15 dark:text-[#f6b8a0]">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[0.66rem] leading-relaxed text-muted dark:text-pine-200/65">
                  By posting, you agree to the community guidelines. Do not share
                  anyone&apos;s private information.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || !content.trim()}
                  className="shrink-0"
                >
                  {submitting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Feather className="h-4 w-4" aria-hidden="true" />
                  )}
                  {submitting ? 'Publishing…' : 'Publish anonymously'}
                </Button>
              </div>
            </form>
          )}
        </CommunityAuthGate>
      </div>

      <SafetyFooter />
    </PageShell>
  );
}
