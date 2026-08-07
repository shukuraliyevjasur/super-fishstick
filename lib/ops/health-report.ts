import { prisma } from "@/lib/db/client";
import { getDMQueue, getRedisConnection } from "@/lib/queue/client";
import {
  getWorkerHealth,
  getWorkerAlerts,
  type WorkerHeartbeat,
  type WorkerAlert,
} from "@/lib/ops/worker-health";

/**
 * The liveness checks behind `/api/health` and `/api/cron/health-check`.
 *
 * Extracted so the alerting cron runs exactly the same checks the monitoring
 * endpoint reports, rather than a second implementation that can drift.
 */

export type CheckStatus = "ok" | "error";

export interface HealthCheck {
  status: CheckStatus;
  detail?: string;
}

export interface QueueCheck extends HealthCheck {
  counts?: unknown;
}

export interface WorkerCheck {
  healthy: boolean;
  heartbeat: WorkerHeartbeat | null;
  ageMs: number | null;
  error?: string;
}

export interface WorkerAlertsCheck {
  recentAlerts: WorkerAlert[];
  failing: boolean;
}

export interface HealthReport {
  healthy: boolean;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    queue: QueueCheck;
    worker: WorkerCheck;
    workerAlerts: WorkerAlertsCheck;
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : "Database check failed",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  try {
    const pong = await getRedisConnection().ping();
    return { status: pong === "PONG" ? "ok" : "error", detail: pong };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : "Redis check failed",
    };
  }
}

async function checkQueue(): Promise<QueueCheck> {
  try {
    const counts = await getDMQueue().getJobCounts(
      "waiting",
      "active",
      "delayed",
      "failed"
    );
    return { status: "ok", counts };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : "Queue check failed",
    };
  }
}

const ALERT_WINDOW_MS = 10 * 60 * 1000;
const ALERT_THRESHOLD = 3;

async function checkWorkerAlerts(): Promise<WorkerAlertsCheck> {
  const alerts = await getWorkerAlerts(25).catch(() => []);
  const cutoff = Date.now() - ALERT_WINDOW_MS;
  const recent = alerts.filter(
    (a) => new Date(a.createdAt).getTime() >= cutoff
  );
  return { recentAlerts: recent, failing: recent.length >= ALERT_THRESHOLD };
}

export async function buildHealthReport(): Promise<HealthReport> {
  const [database, redis, queue, worker, workerAlerts] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkQueue(),
    getWorkerHealth().catch(
      (error): WorkerCheck => ({
        healthy: false,
        heartbeat: null,
        ageMs: null,
        error: error instanceof Error ? error.message : "Worker check failed",
      })
    ),
    checkWorkerAlerts(),
  ]);

  return {
    healthy:
      database.status === "ok" &&
      redis.status === "ok" &&
      queue.status === "ok" &&
      worker.healthy,
    checks: { database, redis, queue, worker, workerAlerts },
  };
}

export interface TokenRefreshFailure {
  message: string;
  createdAt: Date;
  workspaceId: string | null;
}

/**
 * Recent token-refresh failures (C3).
 *
 * `refresh-tokens` records these as OperationalEvents and nothing ever reads
 * them, so a broken refresh is invisible until every connected account drops at
 * the 60-day mark. The default window covers more than one daily cron run, so a
 * failure is still reported if the health check runs before the next refresh.
 */
export async function getRecentTokenRefreshErrors(
  windowMs = 26 * 60 * 60 * 1000,
  limit = 20
): Promise<TokenRefreshFailure[]> {
  return prisma.operationalEvent.findMany({
    where: {
      source: "TOKEN_REFRESH",
      level: "ERROR",
      createdAt: { gte: new Date(Date.now() - windowMs) },
    },
    select: { message: true, createdAt: true, workspaceId: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
