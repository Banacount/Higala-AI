import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ToolCard } from '@/components/tools/ToolCard';
import { TOOL_IDS, type ToolId } from '@/shared/types';

type FeaturedToolId = Exclude<ToolId, 'none'>;

const FEATURED_TOOL_IDS = TOOL_IDS.filter(
  (id): id is FeaturedToolId => id !== 'none',
);

const LAST_TOOL_KEY = 'higala.home.featured-tool';

/** Picks a featured tool, avoiding the one shown in the previous session. */
function pickRandomTool(): FeaturedToolId {
  let previous: string | null = null;
  try {
    previous = window.sessionStorage.getItem(LAST_TOOL_KEY);
  } catch {
    // Storage can be unavailable in private modes; a plain random pick is fine.
  }

  const candidates = FEATURED_TOOL_IDS.filter((id) => id !== previous);
  const pool = candidates.length > 0 ? candidates : FEATURED_TOOL_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Shows one rotating featured tool on the home page. */
export function QuickTools() {
  const [toolId] = useState<FeaturedToolId>(pickRandomTool);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(LAST_TOOL_KEY, toolId);
    } catch {
      // Ignore storage failures.
    }
  }, [toolId]);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600 dark:text-pine-300">
            Small tools, hard moments
          </p>
          <h2 className="mt-1 font-display text-[1.5rem] font-semibold leading-tight text-pine-950 dark:text-cream">
            Don’t face hard moments empty-handed.
          </h2>
        </div>
        <Link
          to="/toolkit"
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.64rem] font-bold uppercase tracking-[0.1em] text-pine-700 transition hover:bg-white/60 dark:text-pine-300 dark:hover:bg-white/[0.08]"
        >
          All tools
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_20rem] sm:items-center">
        <div className="max-w-md">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-pine-600/70 dark:text-pine-300/75">
            One tool at a time
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-pine-200/70">
            Here is one small thing you can try today. Open it when you need
            it — the full toolkit is always one tap away.
          </p>
        </div>
        <ToolCard id={toolId} />
      </div>
    </section>
  );
}
