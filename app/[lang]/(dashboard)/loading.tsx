/**
 * Dashboard routes are dynamic because they load workspace-scoped data. This
 * boundary is deliberately at the dashboard segment so Next can prefetch its
 * shell and replace the old page immediately on navigation.
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading</span>
      <div className="space-y-2">
        <div className="h-7 w-44 animate-pulse rounded-md bg-border" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-border" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="panel rounded-lg p-4">
            <div className="h-7 w-16 animate-pulse rounded bg-border" />
            <div className="mt-3 h-4 w-28 animate-pulse rounded bg-border" />
          </div>
        ))}
      </div>
      <div className="panel space-y-4 rounded-lg p-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-md bg-border" />
        ))}
      </div>
    </div>
  );
}
