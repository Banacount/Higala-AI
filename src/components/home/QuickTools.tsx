import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ToolCard } from '@/components/tools/ToolCard';

export function QuickTools() {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-pine-600">
            Small tools, hard moments
          </p>
          <h2 className="mt-1 font-display text-[1.55rem] font-semibold leading-tight text-pine-950">
            Ayaw og atubang nga walay himan.
          </h2>
        </div>
        <Link
          to="/toolkit"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-pine-900/10 bg-white/60 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-pine-800 transition hover:bg-white"
        >
          All tools
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ToolCard id="breathing" />
        <ToolCard id="grounding" />
        <ToolCard id="thought-record" />
      </div>
    </section>
  );
}
