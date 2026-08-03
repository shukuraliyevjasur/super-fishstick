import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/ops/cron-auth";
import { buildHealthReport } from "@/lib/ops/health-report";

export const runtime = "nodejs";
// Health must reflect live state (worker heartbeat, queue depth), never a
// cached response, or it reports stale worker start times.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Unconditional: the check used to be skipped entirely when CRON_SECRET was
  // unset, which would have made this endpoint public and leaked raw database
  // and Redis error strings (pool internals included) to anyone who asked.
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const report = await buildHealthReport();

  return NextResponse.json(
    {
      status: report.healthy ? "ok" : "degraded",
      checks: report.checks,
    },
    { status: report.healthy ? 200 : 503 }
  );
}
