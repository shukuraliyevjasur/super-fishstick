/**
 * Stat Card
 *
 * Metric panel. `emphasis: "primary"` renders headline metrics larger — the
 * grid mixes both sizes so the eye has somewhere to land instead of scanning
 * six identical boxes.
 */

interface StatCardProps {
  label: string;
  value: string | number;
  emphasis?: "primary" | "secondary";
}

export default function StatCard({
  label,
  value,
  emphasis = "secondary",
}: StatCardProps) {
  const isPrimary = emphasis === "primary";

  return (
    <div className={`panel rounded-lg ${isPrimary ? "p-5" : "p-4"}`}>
      <p className={isPrimary ? "text-sm text-muted" : "text-xs text-subtle"}>
        {label}
      </p>
      <p
        className={`mt-1 font-bold tabular-nums text-foreground ${
          isPrimary ? "text-3xl" : "text-xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
