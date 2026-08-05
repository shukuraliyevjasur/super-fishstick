export default function LogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 rounded-lg bg-border/60" />
        ))}
      </div>
      <div className="panel rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-3 w-16 rounded-md bg-border" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td colSpan={6} className="px-6 py-4">
                  <div className="h-4 bg-border/60 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
