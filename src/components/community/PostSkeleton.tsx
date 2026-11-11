export function PostSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse rounded-[1.6rem] border border-pine-900/8 bg-white/70 p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="h-5 w-24 rounded-full bg-pine-100" />
            <div className="h-3 w-16 rounded-full bg-cream-deep" />
          </div>
          <div className="mt-4 h-3 w-20 rounded-full bg-cream-deep" />
          <div className="mt-4 h-4 w-2/3 rounded-full bg-pine-50" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded-full bg-cream-deep" />
            <div className="h-3 w-11/12 rounded-full bg-cream-deep" />
            <div className="h-3 w-3/4 rounded-full bg-cream-deep" />
          </div>
        </div>
      ))}
    </div>
  );
}
