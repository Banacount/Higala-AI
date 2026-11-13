import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, Heart, MessageCircle } from 'lucide-react';
import { CategoryChip } from '@/components/community/CategoryChip';
import { formatRelativeTime } from '@/lib/utils';
import {
  COMMUNITY_REACTION_IDS,
  type CommunityPost,
} from '@/shared/community';

function reactionTotal(post: CommunityPost): number {
  return COMMUNITY_REACTION_IDS.reduce(
    (sum, reaction) => sum + (post.reactionCounts[reaction] ?? 0),
    0,
  );
}

export function PostCard({
  post,
  className,
}: {
  post: CommunityPost;
  className?: string;
}) {
  const reactions = reactionTotal(post);

  return (
    <Link
      to={`/community/${post.id}`}
      className={clsx(
        'group block p-5 transition duration-200 hover:bg-white/70',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={post.category} />
          {post.isMine ? (
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-pine-600">
              Your post
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-[0.66rem] font-semibold text-muted">
          {formatRelativeTime(post.createdAt)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pine-100 text-[0.6rem] font-extrabold text-pine-700">
          A
        </span>
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted">
          Anonymous
        </span>
      </div>

      {post.title ? (
        <h2 className="mt-2.5 font-display text-lg font-semibold leading-snug text-pine-950">
          {post.title}
        </h2>
      ) : null}

      <p className="mt-2 line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-ink/85">
        {post.content}
      </p>

      <div className="mt-4 flex items-center gap-4 border-t border-pine-900/6 pt-3 text-[0.68rem] font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
        </span>
        {reactions > 0 ? (
          <span className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {reactions} supportive
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1 text-pine-700 transition group-hover:gap-2">
          Read
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
