import clsx from 'clsx';
import {
  communityCategoryLabel,
  type CommunityCategory,
} from '@/shared/community';

export function CategoryChip({
  category,
  className,
}: {
  category: CommunityCategory | null;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.13em]',
        category
          ? 'bg-pine-100 text-pine-800'
          : 'border border-pine-900/10 bg-white/70 text-muted',
        className,
      )}
    >
      {communityCategoryLabel(category)}
    </span>
  );
}
