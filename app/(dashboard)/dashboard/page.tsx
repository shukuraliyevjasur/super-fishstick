"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatCard from "@/components/stat-card";
import StatusBadge from "@/components/status-badge";

interface DashboardStats {
  userName: string | null;
  contactsCount: number;
  totalAutomations: number;
  activeAutomations: number;
  dmsSentToday: number;
  dmsSentWeek: number;
  dmsSentMonth: number;
  dmsSkippedMonth: number;
  dmsFailedMonth: number;
  totalDMs: number;
  clicksThisMonth: number;
  totalClicks: number;
  ctrThisMonth: number;
  instagramAccounts: AccountOption[];
  selectedInstagramAccountId: string | null;
  topKeywords: { keyword: string; count: number }[];
  dailyDMs: { date: string; count: number }[];
  recentLogs: Array<{
    id: string;
    commenterName: string | null;
    commentText: string;
    status: string;
    createdAt: string;
    automation: { name: string };
    instagramAccount?: { username: string };
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccountId !== "all") {
      params.set("instagramAccountId", selectedAccountId);
    }

    fetch(`/api/dashboard/stats${params.size ? `?${params}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  if (loading) {
    // Mirrors the loaded layout (greeting + 2 primary + 4 secondary stats) so
    // nothing jumps when data arrives.
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-56 rounded-md bg-border/60" />
          <div className="mt-2 h-4 w-72 rounded-md bg-border/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="panel rounded-lg p-5">
              <div className="h-4 w-24 rounded-md bg-border" />
              <div className="mt-2 h-9 w-20 rounded-md bg-border/60" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="panel rounded-lg p-4">
              <div className="h-3 w-20 rounded-md bg-border" />
              <div className="mt-2 h-7 w-14 rounded-md bg-border/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxDM = Math.max(...(stats?.dailyDMs.map((d) => d.count) ?? [1]), 1);
  const connectedCount = stats?.instagramAccounts.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Salom, {stats?.userName ?? "foydalanuvchi"}!
          </h1>
          <p className="mt-1 text-sm text-muted">
            {connectedCount} ta ulangan{" "}
            {connectedCount === 1 ? "akkaunt" : "akkaunt"}
            {" · "}
            {stats?.contactsCount ?? 0} ta kontakt
            {" · "}
            <a href="/logs" className="text-accent hover:underline">
              Faoliyatni ko&apos;rish
            </a>
          </p>
        </div>
        {stats && stats.instagramAccounts.length > 1 && (
          <AccountSelect
            accounts={stats.instagramAccounts}
            value={selectedAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {/* Onboarding checklist — hidden once all 3 steps are done */}
      {(() => {
        const step1 = connectedCount > 0;
        const step2 = (stats?.totalAutomations ?? 0) > 0;
        const step3 = (stats?.totalDMs ?? 0) > 0;
        if (step1 && step2 && step3) return null;
        const steps = [
          { done: step1, label: "Instagram akkauntingizni ulang", href: "/api/instagram/connect" },
          { done: step2, label: "Birinchi kampaniyangizni yarating", href: "/campaigns/new" },
          { done: step3, label: "Testdan o'tkazing", href: "/logs" },
        ];
        const doneCount = steps.filter((s) => s.done).length;
        return (
          <div className="panel rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Boshlash uchun 3 qadam</h2>
              <span className="text-xs text-muted">{doneCount} / 3 bajarildi</span>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${step.done ? "bg-success/10" : "border-2 border-border"}`}>
                    {step.done && (
                      <svg className="w-3 h-3 text-success" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 5 9 10 3"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${step.done ? "text-muted line-through" : "text-foreground"}`}>
                    {step.label}
                  </span>
                  {!step.done && (
                    <a href={step.href} className="text-xs font-semibold text-accent hover:underline shrink-0">
                      Boshlash →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Headline metrics — the two numbers the business actually runs on. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="DM yuborildi (oy)"
          value={stats?.dmsSentMonth ?? 0}
          emphasis="primary"
        />
        <StatCard
          label="CTR (oy)"
          value={`${stats?.ctrThisMonth ?? 0}%`}
          emphasis="primary"
        />
      </div>

      {/* Supporting metrics — diagnostics, deliberately quieter. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Faol kampaniyalar" value={stats?.activeAutomations ?? 0} />
        <StatCard label="Kliklar" value={stats?.clicksThisMonth ?? 0} />
        <StatCard label="O'tkazib yuborildi" value={stats?.dmsSkippedMonth ?? 0} />
        <StatCard label="Muvaffaqiyatsiz" value={stats?.dmsFailedMonth ?? 0} />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* 7-Day Chart */}
        <div className="lg:col-span-3 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">DM — oxirgi 7 kun</h2>
          {/* Baseline + midpoint gridline: makes the bars read as measured data
              rather than decoration. */}
          <div className="relative h-40">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
            <div className="relative flex h-full items-end gap-2">
              {stats?.dailyDMs.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-muted">
                    {day.count}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-accent min-h-[4px]"
                    style={{ height: `${Math.max((day.count / maxDM) * 100, 4)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {stats?.dailyDMs.map((day) => (
              <span key={day.date} className="flex-1 text-center text-xs text-subtle">
                {day.date}
              </span>
            ))}
          </div>
        </div>

        {/* Top Keywords */}
        <div className="lg:col-span-1 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Top kalit so&apos;zlar</h2>
          <div className="space-y-3">
            {stats?.topKeywords.length === 0 && (
              <div className="py-6">
                <p className="text-sm text-muted">
                  Hali mos kelgan kalit so&apos;z yo&apos;q.
                </p>
                <p className="mt-1 text-xs text-subtle">
                  Izohlarda eng ko&apos;p ishlatilgan kalit so&apos;zlar shu yerda
                  ko&apos;rinadi.
                </p>
              </div>
            )}
            {stats?.topKeywords.map((keyword) => (
              <div key={keyword.keyword} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">
                  {keyword.keyword}
                </span>
                <span className="text-xs text-muted">{keyword.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">So&apos;nggi faoliyat</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {stats?.recentLogs.length === 0 && (
              <div className="py-6">
                <p className="text-sm text-muted">Hali faoliyat yo&apos;q.</p>
                <p className="mt-1 text-xs text-subtle">
                  Kimdir kalit so&apos;z bilan izoh yozganda, yuborilgan DM shu
                  yerda paydo bo&apos;ladi.
                </p>
                <Link
                  href="/campaigns/new"
                  className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  Kampaniya yaratish →
                </Link>
              </div>
            )}
            {stats?.recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    @{log.commenterName ?? "noma'lum"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {log.instagramAccount
                      ? `@${log.instagramAccount.username} · `
                      : ""}
                    {log.commentText}
                  </p>
                </div>
                <StatusBadge status={log.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
