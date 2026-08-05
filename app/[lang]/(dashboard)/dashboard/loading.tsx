export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="h-8 w-56 rounded-md bg-border/60" />
        <div className="mt-2 h-4 w-72 rounded-md bg-border/40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="panel rounded-lg p-5">
            <div className="h-4 w-24 rounded-md bg-border" />
            <div className="mt-2 h-9 w-20 rounded-md bg-border/60" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel rounded-lg p-4">
            <div className="h-3 w-20 rounded-md bg-border" />
            <div className="mt-2 h-7 w-14 rounded-md bg-border/60" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
        <div className="lg:col-span-3 panel rounded-lg p-6">
          <div className="mb-6 h-5 w-32 rounded-md bg-border/60" />
          <div className="relative flex h-40 items-end gap-2">
            {[40, 70, 30, 90, 50, 80, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-border/40"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1 panel rounded-lg p-6">
          <div className="mb-4 h-5 w-24 rounded-md bg-border/60" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-full rounded-md bg-border/40" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 panel rounded-lg p-6">
          <div className="mb-4 h-5 w-28 rounded-md bg-border/60" />
          <div className="space-y-0">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border py-3 last:border-0"
              >
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-24 rounded-md bg-border/60" />
                  <div className="h-3 w-40 rounded-md bg-border/40" />
                </div>
                <div className="h-5 w-14 rounded-full bg-border/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
