export default function InboxLoading() {
  return (
    <div className="animate-pulse flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-border">
      <div className="w-72 shrink-0 border-r border-border">
        <div className="border-b border-border p-3">
          <div className="h-8 w-full rounded-md bg-border/40" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border p-3"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-border/60" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 rounded-md bg-border/60" />
              <div className="h-3 w-36 rounded-md bg-border/40" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="border-b border-border p-4">
          <div className="h-5 w-32 rounded-md bg-border/60" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "" : "justify-end"}`}>
              <div
                className={`rounded-xl p-3 ${
                  i % 2 === 0 ? "w-48 bg-border/40" : "w-40 bg-border/60"
                }`}
              >
                <div className="h-4 rounded-md bg-border/40" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <div className="h-10 w-full rounded-md bg-border/40" />
        </div>
      </div>
    </div>
  );
}
