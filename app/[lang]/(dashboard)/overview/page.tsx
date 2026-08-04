"use client";

import { useEffect, useState } from "react";
import AccountSelect from "@/components/account-select";
import StatCard from "@/components/stat-card";
import { useDict, t } from "@/components/dictionary-provider";
import { intlLocale } from "@/lib/i18n/format";
import type { OverviewResponse } from "@/app/api/instagram/overview/route";

function formatNumber(n: number | null, locale: string): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(locale);
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

/** `all` is not a number, so it takes its own label rather than `lastN`. */
const COUNT_OPTIONS = ["25", "50", "100", "all"] as const;

export default function OverviewPage() {
  const dict = useDict();
  const d = dict.overview;
  const locale = intlLocale(dict.locale);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [count, setCount] = useState("50");

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccountId !== "all") {
      params.set("instagramAccountId", selectedAccountId);
    }
    params.set("count", count);

    fetch(`/api/instagram/overview?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.error ?? d.errLoad);
        }
      })
      .catch(() => setError(d.errLoad))
      .finally(() => setLoading(false));
  }, [selectedAccountId, count, d.errLoad]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  function handleCountChange(next: string) {
    setLoading(true);
    setCount(next);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="panel rounded-lg p-5 h-24">
            <div className="h-3 w-16 bg-border rounded-md" />
            <div className="mt-3 h-6 w-20 bg-border/60 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel rounded-lg p-8 text-center">
        <p className="text-sm text-error">{error}</p>
        {error.includes("connect") && (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- API route, not a page: needs a full navigation so the server can 302 to Meta.
          <a href="/api/instagram/connect" className="mt-4 inline-block text-sm text-accent hover:underline">
            {d.connect}
          </a>
        )}
      </div>
    );
  }

  if (!data) return null;

  const { totals, posts, accounts, insightsAvailable } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted mt-1">
            {data.requestedCount === "all" ? d.rangeAll : d.rangeRecent} —{" "}
            {t(d.postsSummary, {
              count: totals.posts,
              username: data.account.username,
            })}
            {data.truncated
              ? t(d.truncatedSuffix, { count: totals.posts })
              : ""}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {d.show}
            </span>
            <select
              value={count}
              onChange={(e) => handleCountChange(e.target.value)}
              className="min-w-36 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors"
            >
              {COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? d.countAll : t(d.lastN, { n: option })}
                </option>
              ))}
            </select>
          </label>
          {accounts.length > 1 && (
            <AccountSelect
              accounts={accounts.map((a) => ({ id: a.id, username: a.username, instagramId: a.id }))}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}
        </div>
      </div>

      {!insightsAvailable && (
        <div className="rounded-lg p-4 bg-warning/5 border border-warning/30">
          <p className="text-sm font-medium text-foreground">
            {d.insightsTitle}
          </p>
          <p className="text-sm text-muted mt-1">{d.insightsBody}</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route, not a page: needs a full navigation so the server can 302 to Meta. */}
          <a href="/api/instagram/connect" className="mt-3 inline-block text-sm text-accent hover:underline font-medium">
            {d.reconnect}
          </a>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label={dict.metrics.views} value={formatNumber(totals.views, locale)} />
        <StatCard label={dict.metrics.reach} value={formatNumber(totals.reach, locale)} />
        <StatCard label={dict.metrics.likes} value={formatNumber(totals.likes, locale)} />
        <StatCard label={dict.metrics.comments} value={formatNumber(totals.comments, locale)} />
        <StatCard label={dict.metrics.saved} value={formatNumber(totals.saved, locale)} />
        <StatCard label={dict.metrics.shares} value={formatNumber(totals.shares, locale)} />
      </div>

      {/* Per-post table */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{d.postsHeading}</h2>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-muted py-12 text-center">{d.noPosts}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border bg-background">
                  <th className="py-3 px-6 font-semibold">{d.colPost}</th>
                  <th className="py-3 px-3 font-semibold text-right">{dict.metrics.views}</th>
                  <th className="py-3 px-3 font-semibold text-right">{dict.metrics.reach}</th>
                  <th className="py-3 px-3 font-semibold text-right">{dict.metrics.likes}</th>
                  <th className="py-3 px-3 font-semibold text-right">{dict.metrics.comments}</th>
                  <th className="py-3 px-3 font-semibold text-right">{dict.metrics.saved}</th>
                  <th className="py-3 px-3 font-semibold text-right">{dict.metrics.shares}</th>
                  <th className="py-3 pl-3 pr-6 font-semibold text-right">{d.colDate}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p, i) => (
                  <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-background/50" : ""}`}>
                    <td className="py-3 px-6 max-w-xs">
                      {p.permalink ? (
                        <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent truncate block">
                          {p.caption || `${p.mediaType} post`}
                        </a>
                      ) : (
                        <span className="text-foreground truncate block">{p.caption || `${p.mediaType} post`}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-muted">{formatNumber(p.views, locale)}</td>
                    <td className="py-3 px-3 text-right text-muted">{formatNumber(p.reach, locale)}</td>
                    <td className="py-3 px-3 text-right text-muted">{formatNumber(p.likes, locale)}</td>
                    <td className="py-3 px-3 text-right text-muted">{formatNumber(p.comments, locale)}</td>
                    <td className="py-3 px-3 text-right text-muted">{formatNumber(p.saved, locale)}</td>
                    <td className="py-3 px-3 text-right text-muted">{formatNumber(p.shares, locale)}</td>
                    <td className="py-3 pl-3 pr-6 text-right text-muted">{formatDate(p.timestamp, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
