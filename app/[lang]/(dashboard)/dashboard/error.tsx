"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel rounded-lg p-8 text-center space-y-3">
      <p className="text-sm text-muted">{error.message ?? "Something went wrong"}</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
