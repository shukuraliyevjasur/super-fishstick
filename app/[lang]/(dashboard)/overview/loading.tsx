export default function OverviewLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-md bg-border/60" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel rounded-lg p-4">
            <div className="h-3 w-20 rounded-md bg-border" />
            <div className="mt-2 h-7 w-14 rounded-md bg-border/60" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-md bg-border/40" />
        ))}
      </div>
    </div>
  );
}
