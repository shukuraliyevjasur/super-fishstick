"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import type { Dict } from "@/lib/i18n/types";

const STATUS_FILTERS: { value: string; key: keyof Dict["dmStatus"] | null }[] = [
  { value: "ALL", key: null },
  { value: "SENT", key: "sent" },
  { value: "FAILED", key: "failed" },
  { value: "PENDING", key: "pending" },
  { value: "SKIPPED_RATE_LIMIT", key: "rateLimit" },
  { value: "SKIPPED_PLAN_LIMIT", key: "planLimit" },
  { value: "SKIPPED_DEDUP", key: "dedup" },
];

interface Props {
  currentStatus: string;
  currentPage: number;
  currentAccountId: string;
  totalPages: number;
  total: number;
  limit: number;
  accounts: AccountOption[];
  dict: Pick<Dict, "logs" | "dmStatus">;
}

export default function LogFilters({
  currentStatus,
  currentPage,
  currentAccountId,
  totalPages,
  total,
  limit,
  accounts,
  dict,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleFilterChange(status: string) {
    setOptimisticStatus(status);
    pushParams({ status: status === "ALL" ? null : status, page: null });
  }

  function handleAccountChange(accountId: string) {
    pushParams({ accountId: accountId === "all" ? null : accountId, page: null });
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, key }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              disabled={isPending}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  optimisticStatus === value
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-surface text-muted border border-border hover:border-border-hover hover:text-foreground"
                }
                ${isPending ? "opacity-60 cursor-wait" : ""}
              `}
            >
              {key ? dict.dmStatus[key] : dict.logs.filterAll}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <AccountSelect
            accounts={accounts}
            value={currentAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-0 py-2">
          <p className="text-xs text-muted">
            {(currentPage - 1) * limit + 1}–
            {Math.min(currentPage * limit, total)} / {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => pushParams({ page: String(currentPage - 1) })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              {dict.logs.prev}
            </button>
            <span className="text-xs text-muted px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => pushParams({ page: String(currentPage + 1) })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              {dict.logs.next}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
