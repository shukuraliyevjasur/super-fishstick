"use client";

import { useDict } from "@/components/dictionary-provider";
import type { Dict } from "@/lib/i18n/types";

/**
 * Shared by the logs table, campaign detail and diagnostics, so translating it
 * once covers all three. Colour stays here; the label comes from the dictionary.
 */
const statusConfig: Record<
  string,
  { text: string; key: keyof Dict["dmStatus"] }
> = {
  SENT: { text: "text-success", key: "sent" },
  FAILED: { text: "text-error", key: "failed" },
  PENDING: { text: "text-warning", key: "pending" },
  SKIPPED_DEDUP: { text: "text-muted", key: "dedup" },
  SKIPPED_RATE_LIMIT: { text: "text-warning", key: "rateLimit" },
  SKIPPED_PLAN_LIMIT: { text: "text-muted", key: "planLimit" },
  SKIPPED_NO_MATCH: { text: "text-muted", key: "noMatch" },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const dict = useDict();
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <span className={`text-sm ${config.text}`}>{dict.dmStatus[config.key]}</span>
  );
}
