export default function DiagnosticsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded-md bg-border/60" />
      <div className="panel space-y-3 rounded-lg p-5">
        <div className="h-5 w-32 rounded-md bg-border/60" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-36 rounded-md bg-border/40" />
            <div className="h-5 w-16 rounded-full bg-border/40" />
          </div>
        ))}
      </div>
      <div className="panel overflow-hidden rounded-lg">
        <div className="border-b border-border px-4 py-3">
          <div className="h-5 w-32 rounded-md bg-border/60" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-border px-4 py-3 last:border-0"
          >
            <div className="h-4 w-32 rounded-md bg-border/40" />
            <div className="h-4 flex-1 rounded-md bg-border/40" />
            <div className="h-4 w-24 rounded-md bg-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
