"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/status-badge";
import { useDict, t } from "@/components/dictionary-provider";
import { intlLocale } from "@/lib/i18n/format";

interface DiagnosticsData {
  /** Queue depth and worker alerts are global, so they are admin-only (S2). */
  isPlatformAdmin: boolean;
  queueCounts: Record<string, number> | null;
  workerHealth: {
    healthy: boolean;
    ageMs: number | null;
    heartbeat: {
      checkedAt: string;
      hostname?: string;
      pid: number;
      startedAt?: string;
    } | null;
  };
  workerAlerts: Array<{
    level: string;
    message: string;
    jobId?: string;
    commentId?: string;
    createdAt: string;
  }> | null;
  webhookFailures: Array<{
    id: string;
    object: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
  dmFailures: Array<{
    id: string;
    status: string;
    commentId: string;
    commentText: string;
    errorMessage: string | null;
    updatedAt: string;
    automation: { name: string };
  }>;
  tokenRefreshFailures: Array<{
    id: string;
    message: string;
    createdAt: string;
  }>;
  operationalEvents: Array<{
    id: string;
    source: string;
    level: string;
    message: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-5 text-center text-sm text-muted">{label}</p>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel rounded-md p-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DiagnosticsPage() {
  const dict = useDict();
  const d = dict.diagnostics;
  const locale = intlLocale(dict.locale);
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resubscribing, setResubscribing] = useState(false);
  const [resubscribeResult, setResubscribeResult] = useState<string | null>(null);

  async function refreshDiagnostics() {
    setLoading(true);
    const response = await fetch("/api/admin/diagnostics");
    const payload = await response.json();
    if (payload.success) {
      setData(payload.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialDiagnostics() {
      const response = await fetch("/api/admin/diagnostics");
      const payload = await response.json();
      if (active && payload.success) {
        setData(payload.data);
      }
      if (active) {
        setLoading(false);
      }
    }

    void loadInitialDiagnostics();

    return () => {
      active = false;
    };
  }, []);

  if (loading && !data) {
    return <div className="panel rounded-md p-8 h-64" />;
  }

  const workerAgeSeconds =
    data?.workerHealth.ageMs == null
      ? null
      : Math.round(data.workerHealth.ageMs / 1000);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{d.heading}</h1>
          <p className="mt-1 text-sm text-muted">{d.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setResubscribing(true);
              setResubscribeResult(null);
              const res = await fetch("/api/instagram/resubscribe", { method: "POST" });
              const payload = await res.json();
              if (payload.success) {
                const lines = (payload.data as Array<{ username: string; success: boolean }>)
                  .map((r) => `@${r.username}: ${r.success ? "✓" : "✗"}`)
                  .join(", ");
                setResubscribeResult(lines || d.resubscribeNoAccounts);
              } else {
                setResubscribeResult(d.resubscribeFailed);
              }
              setResubscribing(false);
            }}
            disabled={resubscribing}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-border-hover disabled:opacity-50"
          >
            {resubscribing ? d.resubscribing : d.resubscribe}
          </button>
          <button
            onClick={() => void refreshDiagnostics()}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-border-hover"
          >
            {d.refresh}
          </button>
        </div>
        {resubscribeResult && (
          <p className="text-xs text-muted sm:text-right">{resubscribeResult}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel rounded-md p-5">
          <p className="text-xs font-semibold uppercase text-muted">
            {d.workerStatus}
          </p>
          <p
            className={`mt-3 text-2xl font-bold ${
              data?.workerHealth.healthy ? "text-success" : "text-warning"
            }`}
          >
            {data?.workerHealth.healthy ? d.workerHealthy : d.workerAttention}
          </p>
          {/* Heartbeat age is worker infrastructure detail, so it is only sent
              to platform admins. Customers see liveness alone. */}
          {data?.isPlatformAdmin && (
            <p className="mt-2 text-xs text-muted">
              {workerAgeSeconds == null
                ? d.noHeartbeat
                : t(d.heartbeatAge, { seconds: workerAgeSeconds })}
            </p>
          )}
        </div>
        {data?.queueCounts &&
          ["waiting", "active", "delayed", "failed"].map((key) => (
            <div key={key} className="panel rounded-md p-5">
              <p className="text-xs font-semibold uppercase text-muted">
                {t(d.queue, { name: key })}
              </p>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {data.queueCounts?.[key] ?? 0}
              </p>
            </div>
          ))}
      </div>

      {data?.workerAlerts && (
      <Section title={d.workerAlerts}>
        {data.workerAlerts.length ? (
          <div className="space-y-3">
            {data.workerAlerts.map((alert) => (
              <div
                key={`${alert.createdAt}-${alert.jobId ?? alert.message}`}
                className="rounded-md border border-border bg-surface/50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {alert.message}
                  </p>
                  <span className="rounded-full bg-error/10 px-2 py-1 text-xs font-semibold text-error">
                    {alert.level}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {formatDate(alert.createdAt, locale)}
                  {alert.commentId ? ` · ${alert.commentId}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label={d.noWorkerAlerts} />
        )}
      </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={d.dmFailures}>
          {data?.dmFailures.length ? (
            <div className="space-y-3">
              {data.dmFailures.map((item) => (
                <div key={item.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.automation.name}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {item.commentText}
                  </p>
                  {item.errorMessage && (
                    <p className="mt-1 text-xs text-error">{item.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label={d.noDmFailures} />
          )}
        </Section>

        <Section title={d.webhookFailures}>
          {data?.webhookFailures.length ? (
            <div className="space-y-3">
              {data.webhookFailures.map((event) => (
                <div key={event.id} className="border-b border-border pb-3 last:border-0">
                  <p className="text-sm font-semibold text-foreground">
                    {event.object ?? "Instagram webhook"}
                  </p>
                  <p className="mt-1 text-xs text-error">
                    {event.errorMessage ?? d.unknownError}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(event.createdAt, locale)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label={d.noWebhookFailures} />
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={d.tokenFailures}>
          {data?.tokenRefreshFailures.length ? (
            <div className="space-y-3">
              {data.tokenRefreshFailures.map((event) => (
                <div key={event.id} className="border-b border-border pb-3 last:border-0">
                  <p className="text-sm font-semibold text-foreground">
                    {event.message}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(event.createdAt, locale)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label={d.noTokenFailures} />
          )}
        </Section>

      </div>

      <Section title={d.events}>
        {data?.operationalEvents.length ? (
          <div className="space-y-3">
            {data.operationalEvents.map((event) => (
              <div key={event.id} className="grid gap-2 border-b border-border pb-3 last:border-0 sm:grid-cols-[140px_1fr_auto]">
                <p className="text-xs font-semibold text-muted">{event.source}</p>
                <p className="text-sm text-foreground">{event.message}</p>
                <p className="text-xs text-muted">{formatDate(event.createdAt, locale)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label={d.noEvents} />
        )}
      </Section>
    </div>
  );
}
