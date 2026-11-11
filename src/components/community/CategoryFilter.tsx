import clsx from 'clsx';
import {
  COMMUNITY_CATEGORIES,
  type CommunityCategory,
} from '@/shared/community';

export function CategoryFilter({
  value,
  onChange,
}: {
  value: CommunityCategory | null;
  onChange: (value: CommunityCategory | null) => void;
}) {
  const options: Array<{ id: CommunityCategory | null; label: string }> = [
    { id: null, label: 'All' },
    ...COMMUNITY_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.shortLabel,
    })),
  ];

  return (
    <div
      role="group"
      aria-label="Filter posts by category"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id ?? 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors',
              active
                ? 'bg-pine-900 text-cream shadow-[0_10px_24px_-18px_rgba(7,37,28,.9)]'
                : 'border border-pine-900/10 bg-white/65 text-muted hover:border-pine-900/20 hover:text-pine-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
