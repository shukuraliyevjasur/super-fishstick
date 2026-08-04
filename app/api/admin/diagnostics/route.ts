import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { isCurrentUserPlatformAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/client";
import { getDMQueue } from "@/lib/queue/client";
import { getWorkerAlerts, getWorkerHealth } from "@/lib/ops/worker-health";

export const runtime = "nodejs";

/**
 * S2. The route is named `admin` but is reached from the ordinary customer
 * sidebar, so it cannot simply be gated on an admin role without deleting a
 * customer feature. Instead the cross-tenant parts are gated and the
 * workspace-scoped parts stay open to the workspace:
 *
 * | Data                          | Who sees it |
 * |-------------------------------|-------------|
 * | webhook / DM / token failures | the workspace (already scoped) |
 * | worker healthy true-false     | everyone — "is the platform running" |
 * | queue depth, worker alerts,   | platform admins only — these are |
 * | heartbeat internals, system   | global, and alerts carry other |
 * | operational events            | tenants' job and comment ids |
 *
 * Note `payload` is deliberately not selected on the system-wide event query;
 * that is what keeps webhook body previews from leaking. Do not widen it.
 */
export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const isPlatformAdmin = await isCurrentUserPlatformAdmin();

  const [
    workerHealth,
    webhookFailures,
    dmFailures,
    tokenRefreshFailures,
    operationalEvents,
  ] = await Promise.all([
    // Also a Redis read, and it sits in the same Promise.all as the Prisma
    // queries — an unhandled rejection here 500s the entire page.
    getWorkerHealth().catch(() => ({
      healthy: false,
      heartbeat: null,
      ageMs: null,
    })),
    prisma.webhookEvent.findMany({
      where: { workspaceId, status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        object: true,
        errorMessage: true,
        createdAt: true,
        processedAt: true,
      },
    }),
    prisma.dmLog.findMany({
      where: {
        workspaceId,
        status: {
          in: [
            "FAILED",
            "SKIPPED_RATE_LIMIT",
            "SKIPPED_PLAN_LIMIT",
            "SKIPPED_NO_MATCH",
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        commentId: true,
        commentText: true,
        errorMessage: true,
        updatedAt: true,
        automation: { select: { name: true } },
      },
    }),
    prisma.operationalEvent.findMany({
      where: { workspaceId, source: "TOKEN_REFRESH", level: "ERROR" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        message: true,
        createdAt: true,
        payload: true,
      },
    }),
    prisma.operationalEvent.findMany({
      // System-wide events (`workspaceId: null`) belong to no tenant and are
      // only included for platform admins.
      where: isPlatformAdmin
        ? { OR: [{ workspaceId }, { workspaceId: null }] }
        : { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        source: true,
        level: true,
        message: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
  ]);

  // Redis being down must not take the whole diagnostics page with it — that is
  // precisely when an operator is looking at it. `-1` reads as "unknown" rather
  // than a real depth of 0. `getWorkerAlerts` also goes to Redis, so it gets the
  // same treatment.
  const [queueCounts, workerAlerts] = isPlatformAdmin
    ? await Promise.all([
        getDMQueue()
          .getJobCounts("waiting", "active", "delayed", "failed")
          .catch(() => ({ waiting: -1, active: -1, delayed: -1, failed: -1 })),
        getWorkerAlerts(10).catch(() => []),
      ])
    : [null, null];

  return NextResponse.json({
    success: true,
    data: {
      isPlatformAdmin,
      // Liveness only for a customer: whether the platform is processing is
      // legitimately their business, but the hostname, pid and start time of
      // our worker are not.
      workerHealth: isPlatformAdmin
        ? workerHealth
        : { healthy: workerHealth.healthy, ageMs: null, heartbeat: null },
      queueCounts,
      workerAlerts,
      webhookFailures,
      dmFailures,
      tokenRefreshFailures,
      operationalEvents,
    },
  });
}
