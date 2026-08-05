export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
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
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <div className="lg:col-span-3 panel rounded-lg p-6 h-64" />
        <div className="lg:col-span-1 panel rounded-lg p-6 h-64" />
        <div className="lg:col-span-2 panel rounded-lg p-6 h-64" />
      </div>
    </div>
  );
}
