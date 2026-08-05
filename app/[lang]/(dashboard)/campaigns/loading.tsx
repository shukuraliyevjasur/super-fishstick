export default function CampaignsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-md bg-border/60" />
        <div className="h-9 w-36 rounded-md bg-border/40" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md bg-border/60" />
                <div className="space-y-2">
                  <div className="h-5 w-40 rounded-md bg-border/60" />
                  <div className="h-3 w-24 rounded-md bg-border/40" />
                </div>
              </div>
              <div className="h-6 w-16 rounded-full bg-border/40" />
            </div>
            <div className="mt-4 flex gap-4">
              <div className="h-4 w-20 rounded-md bg-border/40" />
              <div className="h-4 w-20 rounded-md bg-border/40" />
              <div className="h-4 w-20 rounded-md bg-border/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
