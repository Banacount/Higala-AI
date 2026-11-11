import { Link } from 'react-router-dom';
import { Feather, HeartHandshake } from 'lucide-react';
import { buttonStyles } from '@/components/ui/Button';
import type { CommunityCategory } from '@/shared/community';
import { communityCategoryLabel } from '@/shared/community';

export function CommunityEmptyState({
  category,
}: {
  category: CommunityCategory | null;
}) {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-pine-900/15 bg-white/55 px-6 py-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-100 text-pine-700">
        <HeartHandshake className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold text-pine-950">
        {category
          ? `No ${communityCategoryLabel(category).toLowerCase()} posts yet`
          : 'The community is quiet right now'}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {category
          ? 'Be the first to share something here, or browse another category. There is no pressure to have the right words.'
          : 'When you are ready, you can be the first to share a thought, a struggle, or a small win. Someone else might need to read it.'}
      </p>
      <Link to="/community/new" className={`${buttonStyles({ size: 'md' })} mt-5`}>
        <Feather className="h-4 w-4" aria-hidden="true" />
        Share your thoughts
      </Link>
    </div>
  );
}
