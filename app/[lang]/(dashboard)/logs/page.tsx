"use client";

import { useEffect, useState, useCallback } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatusBadge from "@/components/status-badge";

interface DmLog {
  id: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  automation: { name: string; keywords: string[] };
  instagramAccount: { username: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Barchasi" },
  { value: "SENT", label: "Yuborildi" },
  { value: "FAILED", label: "Muvaffaqiyatsiz" },
  { value: "PENDING", label: "Navbatda" },
  { value: "SKIPPED_RATE_LIMIT", label: "Cheklov" },
  { value: "SKIPPED_PLAN_LIMIT", label: "O'tkazib yuborildi" },
  { value: "SKIPPED_DEDUP", label: "Takror" },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (selectedAccountId !== "all") {
        params.set("instagramAccountId", selectedAccountId);
      }
      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, selectedAccountId]);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setAccounts(payload.data.instagramAccounts ?? []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchLogs(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLogs]);

  function handleFilterChange(status: string) {
    setLoading(true);
    setStatusFilter(status);
    setPage(1);
  }

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  statusFilter === value
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-surface text-muted border border-border hover:border-border-hover hover:text-foreground"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <AccountSelect
            accounts={accounts}
            value={selectedAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {/* Table */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-background">
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Izoh yozuvchi</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Izoh</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Kampaniya</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Akkaunt</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Holat</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Vaqt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-4 bg-border rounded-md" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    Jurnal yozuvlari topilmadi
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`transition-colors hover:bg-surface-hover ${i % 2 === 1 ? "bg-background/50" : ""}`}
                  >
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-foreground">
                        @{log.commenterName ?? log.commenterId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-[200px]">
                      <span className="text-muted truncate block">{log.commentText}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-muted">{log.automation.name}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-muted">@{log.instagramAccount.username}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-6 py-3.5 text-muted whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString("uz-UZ", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => { setLoading(true); setPage(page - 1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Oldingi
              </button>
              <span className="text-xs text-muted px-2">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => { setLoading(true); setPage(page + 1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
