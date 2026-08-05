export default function LogsLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-md bg-border/60" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-16 rounded-md bg-border/40" />
          ))}
        </div>
      </div>
      <div className="panel overflow-hidden rounded-lg">
        <div className="flex gap-6 border-b border-border px-4 py-3">
          {[80, 120, 100, 80, 60].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded-md bg-border/40"
              style={{ width: w }}
            />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex gap-6 border-b border-border px-4 py-4 last:border-0"
          >
            <div className="h-4 w-28 rounded-md bg-border/60" />
            <div className="h-4 flex-1 rounded-md bg-border/40" />
            <div className="h-4 w-32 rounded-md bg-border/40" />
            <div className="h-5 w-16 rounded-full bg-border/40" />
            <div className="h-4 w-20 rounded-md bg-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
