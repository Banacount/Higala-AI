import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Feather,
  HeartHandshake,
  LifeBuoy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PageHeader, PageShell, SafetyFooter } from '@/components/PageShell';
import { Button, buttonStyles } from '@/components/ui/Button';
import { CategoryFilter } from '@/components/community/CategoryFilter';
import { CommunityAuthGate } from '@/components/community/CommunityAuthGate';
import { CommunityEmptyState } from '@/components/community/CommunityEmptyState';
import { CommunityGuidelinesModal } from '@/components/community/CommunityGuidelinesModal';
import { PostCard } from '@/components/community/PostCard';
import { PostSkeleton } from '@/components/community/PostSkeleton';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCommunityFeed } from '@/hooks/useCommunityFeed';
import type { CommunityCategory } from '@/shared/community';

export function CommunityPage() {
  const { openCrisis } = useApp();
  const { isAdmin } = useAuth();
  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const {
    posts,
    nextCursor,
    loading,
    loadingMore,
    error,
    loadMore,
    refresh,
  } = useCommunityFeed(category);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Community"
        title="Anonymous Sharing"
        subtitle="A quieter corner of Higala. Share what you are carrying, read what others are carrying too, and leave each other a little lighter."
        action={
          <Link
            to="/community/new"
            className={buttonStyles({ size: 'md' })}
          >
            <Feather className="h-4 w-4" aria-hidden="true" />
            Share your thoughts
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-pine-900/8 bg-white/60 p-4">
          <div className="flex items-center gap-2 text-pine-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em]">
              No names
            </p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Posts show only “Anonymous”. Your profile is never attached.
          </p>
        </div>
        <div className="rounded-2xl border border-pine-900/8 bg-white/60 p-4">
          <div className="flex items-center gap-2 text-pine-700">
            <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em]">
              Peer support
            </p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            People here are not therapists. Care, do not diagnose.
          </p>
        </div>
        <div className="rounded-2xl border border-pine-900/8 bg-white/60 p-4">
          <div className="flex items-center gap-2 text-pine-700">
            <Users className="h-4 w-4" aria-hidden="true" />
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em]">
              One shared space
            </p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            English, Bisaya, Filipino, or a mix. Write the way you think.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter value={category} onChange={setCategory} />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setGuidelinesOpen(true)}
            className="rounded-full border border-pine-900/10 bg-white/65 px-3 py-2 text-[0.66rem] font-bold text-pine-800 transition hover:bg-white"
          >
            Guidelines
          </button>
          <button
            type="button"
            onClick={openCrisis}
            className="flex items-center gap-1.5 rounded-full bg-pine-100 px-3 py-2 text-[0.66rem] font-bold text-pine-800 transition hover:bg-pine-200"
          >
            <LifeBuoy className="h-3 w-3" aria-hidden="true" />
            Get help
          </button>
        </div>
      </div>

      <CommunityAuthGate>
        {error ? (
          <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border border-clay/20 bg-clay-soft/70 px-4 py-3 text-sm text-clay sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">{error}</p>
            <Button variant="secondary" size="sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : null}

        {loading ? (
          <PostSkeleton />
        ) : posts.length === 0 ? (
          <CommunityEmptyState category={category} />
        ) : (
          <div className="divide-y divide-pine-900/8 overflow-hidden rounded-[1.6rem] border border-pine-900/8 bg-white/75 shadow-[0_18px_38px_-34px_rgba(7,37,28,.5)]">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {loadingMore ? (
          <div className="mt-5 flex justify-center">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading more
            </p>
          </div>
        ) : null}

        {!loading && posts.length > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            {nextCursor ? (
              <Button
                variant="secondary"
                onClick={loadMore}
                disabled={loadingMore}
              >
                Load older posts
              </Button>
            ) : (
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted/75">
                You have reached the beginning
              </p>
            )}
            <p className="text-[0.62rem] text-muted/80">
              You are reading the newest posts first.
            </p>
          </div>
        ) : null}
      </CommunityAuthGate>

      {isAdmin ? (
        <div className="mt-8 rounded-2xl border border-pine-900/10 bg-pine-50/60 px-4 py-3">
          <p className="text-xs text-muted">
            You have moderator access.{' '}
            <Link
              to="/community/moderation"
              className="font-bold text-pine-800 underline underline-offset-2"
            >
              Open the moderation queue
            </Link>
            .
          </p>
        </div>
      ) : null}

      <SafetyFooter />

      <CommunityGuidelinesModal
        open={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
      />
    </PageShell>
  );
}
