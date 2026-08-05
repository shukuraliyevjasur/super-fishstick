export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-32 rounded-md bg-border/60" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel space-y-4 rounded-lg p-6">
          <div className="h-5 w-40 rounded-md bg-border/60" />
          <div className="h-px bg-border" />
          <div className="space-y-3">
            <div className="h-4 w-24 rounded-md bg-border/40" />
            <div className="h-10 w-full rounded-md bg-border/40" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-md bg-border/40" />
            <div className="h-10 w-full rounded-md bg-border/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
