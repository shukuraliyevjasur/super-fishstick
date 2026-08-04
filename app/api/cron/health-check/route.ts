import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireCronAuth } from "@/lib/ops/cron-auth";
import {
  buildHealthReport,
  getRecentTokenRefreshErrors,
} from "@/lib/ops/health-report";
import { sendOperationalAlert, type AlertResult } from "@/lib/ops/alert-email";
import { downgradeExpiredWorkspaces } from "@/lib/billing/grant";

export const runtime = "nodejs";
// Must reflect live state (worker heartbeat, queue depth), never a cached response.
export const dynamic = "force-dynamic";

/**
 * Turns the existing health checks into something that reaches a human (C1, C3).
 *
 * `/api/health` has always been able to detect a dead worker and answer 503, but
 * nothing called it — so the first signal that DMs had stopped was a customer
 * complaint. This route runs the same checks and emails when the system is
 * degraded or when token refreshes have been failing.
 *
 * SCHEDULING, AND ITS LIMIT. Vercel's free tier fires crons **once per day**, so
 * the daily entry in vercel.json is a backstop, not worker-death detection: a
 * worker that dies just after a run stays dead for ~24h before anyone is told.
 * For real coverage, point an external uptime monitor at this route every few
 * minutes with the `Authorization: Bearer $CRON_SECRET` header. See HANDOFF.md.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const report = await buildHealthReport();
  const refreshErrors = await getRecentTokenRefreshErrors().catch(() => []);

  // P4: reconcile expired plans. Enforcement does not depend on this — every
  // gate goes through getEffectivePlan(), which already treats an expired plan
  // as FREE — so a slow sweep costs nothing but a stale row. Folded in here
  // rather than added as a third cron, since the free tier is daily anyway.
  const expiry = await downgradeExpiredWorkspaces().catch((error) => {
    console.error("[health-check] plan expiry sweep failed", error);
    return { downgraded: 0 };
  });

  const degraded = !report.healthy;
  const shouldAlert = degraded || refreshErrors.length > 0;

  let alert: AlertResult = { sent: false, reason: "no alert needed" };

  if (shouldAlert) {
    const lines: string[] = [`replie health: ${degraded ? "DEGRADED" : "ok"}`, ""];

    for (const [name, check] of Object.entries(report.checks)) {
      const ok = "status" in check ? check.status === "ok" : check.healthy;
      const detail =
        "detail" in check && check.detail
          ? ` — ${check.detail}`
          : "error" in check && check.error
            ? ` — ${check.error}`
            : "";
      lines.push(`${ok ? "ok  " : "FAIL"} ${name}${detail}`);
    }

    if (!report.checks.worker.healthy) {
      const age = report.checks.worker.ageMs;
      lines.push(
        "",
        age === null
          ? "No worker heartbeat in Redis. The DM worker is not running — jobs are queueing and no DMs are being sent."
          : `Worker heartbeat is ${Math.round(age / 1000)}s old. Expected under 120s.`,
        "Check the VM: docker ps, then docker logs replie-worker (see HANDOFF.md).",
      );
    }

    if (refreshErrors.length > 0) {
      lines.push("", `Token refresh failures (last 26h): ${refreshErrors.length}`);
      for (const failure of refreshErrors.slice(0, 5)) {
        lines.push(`  ${failure.createdAt.toISOString()} ${failure.message}`);
      }
      lines.push(
        "A failing refresh is silent until every connected account drops at the 60-day mark.",
      );
    }

    alert = await sendOperationalAlert(
      degraded ? "replie: system degraded" : "replie: token refresh failing",
      lines
    );

    // Record the alert regardless of whether the email got out, so a Resend
    // outage does not also erase the evidence that something was wrong.
    await prisma.operationalEvent
      .create({
        data: {
          workspaceId: null,
          source: "HEALTH",
          level: "ERROR",
          message: degraded
            ? "Health check degraded"
            : "Token refresh failures detected",
          payload: {
            checks: JSON.parse(JSON.stringify(report.checks)),
            tokenRefreshFailures: refreshErrors.length,
            alertSent: alert.sent,
            alertReason: alert.reason ?? null,
          },
        },
      })
      .catch(() => {
        // The database itself may be the thing that is down.
      });
  }

  return NextResponse.json(
    {
      status: report.healthy ? "ok" : "degraded",
      checks: report.checks,
      tokenRefreshFailures: refreshErrors.length,
      plansDowngraded: expiry.downgraded,
      alert,
    },
    { status: report.healthy ? 200 : 503 }
  );
}
