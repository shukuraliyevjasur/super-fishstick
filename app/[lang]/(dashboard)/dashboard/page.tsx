"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatCard from "@/components/stat-card";
import StatusBadge from "@/components/status-badge";
import { useDict, t } from "@/components/dictionary-provider";
import { readCache, writeCache } from "@/lib/client-cache";

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
  plan: string;
  dmQuota: { used: number; limit: number | null } | null;
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
  const dict = useDict();
  const params = useParams();
  const lang = (params.lang as string) || "uz";
  const d = dict.dashboard;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("all");

  useEffect(() => {
    const qs = new URLSearchParams();
    if (selectedAccountId !== "all") {
      qs.set("instagramAccountId", selectedAccountId);
    }
    const cacheKey = `dashboard:stats:${selectedAccountId}`;

    const cached = readCache<DashboardStats>(cacheKey, 30_000);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (cached.data) {
      setStats(cached.data);
      setLoading(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    fetch(`/api/dashboard/stats${qs.size ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
          writeCache(cacheKey, data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  if (loading) {
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

  const maxDM = Math.max(...(stats?.dailyDMs.map((day) => day.count) ?? [1]), 1);
  const connectedCount = stats?.instagramAccounts.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t(d.greeting, { name: stats?.userName ?? "" })}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(d.connectedAccounts, { n: String(connectedCount) })}
            {" · "}
            {t(d.contacts, { n: String(stats?.contactsCount ?? 0) })}
            {" · "}
            <Link href={`/${lang}/logs`} className="text-accent hover:underline">
              {d.activity}
            </Link>
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

      {/* Onboarding checklist */}
      {(() => {
        const step1 = connectedCount > 0;
        const step2 = (stats?.totalAutomations ?? 0) > 0;
        const step3 = (stats?.totalDMs ?? 0) > 0;
        if (step1 && step2 && step3) return null;
        const steps = [
          { done: step1, label: d.onboardingStep1, href: "/api/instagram/connect" },
          { done: step2, label: d.onboardingStep2, href: `/${lang}/campaigns/new` },
          { done: step3, label: d.onboardingStep3, href: `/${lang}/logs` },
        ];
        const doneCount = steps.filter((s) => s.done).length;
        return (
          <div className="panel rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{d.onboardingTitle}</h2>
              <span className="text-xs text-muted">{t(d.onboardingProgress, { done: String(doneCount) })}</span>
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
                      {d.onboardingStart}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* DM usage meter */}
      {stats?.dmQuota && stats.dmQuota.limit !== null && (
        <div className="panel rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{d.dmLimitTitle}</span>
            <span className="text-sm tabular-nums text-muted">
              {stats.dmQuota.used.toLocaleString()} / {stats.dmQuota.limit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-border">
            <div
              className={`h-2 rounded-full transition-all ${
                stats.dmQuota.used / stats.dmQuota.limit > 0.9
                  ? "bg-error"
                  : stats.dmQuota.used / stats.dmQuota.limit > 0.7
                    ? "bg-amber-500"
                    : "bg-accent"
              }`}
              style={{
                width: `${Math.min(100, (stats.dmQuota.used / stats.dmQuota.limit) * 100)}%`,
              }}
            />
          </div>
          {stats.dmQuota.used / stats.dmQuota.limit > 0.9 && (
            <p className="mt-2 text-xs text-error">
              {d.upgradeWarning}{" "}
              <Link href={`/${lang}/pricing`} className="font-medium underline">
                {d.upgradeLinkText}
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Headline metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={d.stat1Label} value={stats?.dmsSentMonth ?? 0} emphasis="primary" />
        <StatCard label={d.stat2Label} value={`${stats?.ctrThisMonth ?? 0}%`} emphasis="primary" />
      </div>

      {/* Supporting metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={d.statActiveCampaigns} value={stats?.activeAutomations ?? 0} />
        <StatCard label={d.statClicks} value={stats?.clicksThisMonth ?? 0} />
        <StatCard label={d.statSkipped} value={stats?.dmsSkippedMonth ?? 0} />
        <StatCard label={d.statFailed} value={stats?.dmsFailedMonth ?? 0} />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* 7-Day Chart */}
        <div className="lg:col-span-3 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">{d.chartTitle}</h2>
          <div className="relative h-40">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
            <div className="relative flex h-full items-end gap-2">
              {stats?.dailyDMs.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-muted">{day.count}</span>
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
              <span key={day.date} className="flex-1 text-center text-xs text-subtle">{day.date}</span>
            ))}
          </div>
        </div>

        {/* Top Keywords */}
        <div className="lg:col-span-1 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{d.keywordsTitle}</h2>
          <div className="space-y-3">
            {stats?.topKeywords.length === 0 && (
              <div className="py-6">
                <p className="text-sm text-muted">{d.noKeywords}</p>
                <p className="mt-1 text-xs text-subtle">{d.noKeywordsSub}</p>
              </div>
            )}
            {stats?.topKeywords.map((kw) => (
              <div key={kw.keyword} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">{kw.keyword}</span>
                <span className="text-xs text-muted">{kw.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{d.activityTitle}</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {stats?.recentLogs.length === 0 && (
              <div className="py-6">
                <p className="text-sm text-muted">{d.noActivity}</p>
                <p className="mt-1 text-xs text-subtle">{d.noActivitySub}</p>
                <Link
                  href={`/${lang}/campaigns/new`}
                  className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  {d.createCampaign}
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
                    @{log.commenterName ?? "—"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {log.instagramAccount ? `@${log.instagramAccount.username} · ` : ""}
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
