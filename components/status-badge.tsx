const statusConfig: Record<string, { text: string; label: string }> = {
  SENT: { text: "text-success", label: "Yuborildi" },
  FAILED: { text: "text-error", label: "Muvaffaqiyatsiz" },
  PENDING: { text: "text-warning", label: "Navbatda" },
  SKIPPED_DEDUP: { text: "text-muted", label: "Takror" },
  SKIPPED_RATE_LIMIT: { text: "text-warning", label: "Cheklov" },
  SKIPPED_PLAN_LIMIT: { text: "text-muted", label: "O'tkazib yuborildi" },
  SKIPPED_NO_MATCH: { text: "text-muted", label: "Mos kelmadi" },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return <span className={`text-sm ${config.text}`}>{config.label}</span>;
}
