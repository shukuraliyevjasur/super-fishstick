export default function CampaignsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="h-4 w-24 rounded-md bg-border/60" />
        <div className="h-9 w-32 rounded-lg bg-border/60" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel rounded-md p-6 h-36" />
      ))}
    </div>
  );
}
