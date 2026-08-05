import "server-only";
import { prisma } from "@/lib/db/client";
import {
  calculateCtr,
  normalizeTopKeywords,
  summarizeDmStatuses,
} from "@/lib/tracking/analytics";
import { getEffectivePlan, getPlanLimits } from "@/lib/billing/plan";

export interface DashboardStats {
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
  instagramAccounts: { id: string; username: string; instagramId: string; name: string | null }[];
  selectedInstagramAccountId: string | null;
  topKeywords: { keyword: string; count: number }[];
  dailyDMs: { date: string; count: number }[];
  recentLogs: {
    id: string;
    commenterName: string | null;
    commentText: string;
    status: string;
    createdAt: Date;
    automation: { name: string };
    instagramAccount: { username: string } | null;
  }[];
}

export async function getDashboardStats(
  workspaceId: string,
  userId: string | null,
  accountId?: string | null
): Promise<DashboardStats> {
  const selectedAccountId =
    accountId && accountId !== "all" ? accountId : null;
  const accountFilter = selectedAccountId
    ? { instagramAccountId: selectedAccountId }
    : {};

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    workspace,
    instagramAccounts,
    totalAutomations,
    activeAutomations,
    dmsSentToday,
    dmsSentWeek,
    dmsSentMonth,
    totalDMs,
    dmStatusCountsThisMonth,
    clicksThisMonth,
    totalClicks,
    topKeywordRows,
    recentLogs,
    user,
    contactRows,
  ] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, plan: true, planExpiresAt: true, dmsSentThisPeriod: true },
    }),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true, instagramId: true, name: true },
    }),
    prisma.automation.count({ where: { workspaceId, ...accountFilter } }),
    prisma.automation.count({ where: { workspaceId, isActive: true, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", createdAt: { gte: todayStart }, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", createdAt: { gte: weekStart }, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", createdAt: { gte: monthStart }, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", ...accountFilter } }),
    prisma.dmLog.groupBy({
      by: ["status"],
      where: { workspaceId, createdAt: { gte: monthStart }, ...accountFilter },
      _count: { _all: true },
    }),
    prisma.linkClick.count({ where: { workspaceId, createdAt: { gte: monthStart }, ...accountFilter } }),
    prisma.linkClick.count({ where: { workspaceId, ...accountFilter } }),
    prisma.dmLog.groupBy({
      by: ["matchedKeyword"],
      where: { workspaceId, matchedKeyword: { not: null }, ...accountFilter },
      _count: { _all: true },
    }),
    prisma.dmLog.findMany({
      where: { workspaceId, ...accountFilter },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        automation: { select: { name: true } },
        instagramAccount: { select: { username: true } },
      },
    }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
      : Promise.resolve(null),
    prisma.dmLog.findMany({
      where: { workspaceId, ...accountFilter },
      distinct: ["commenterId"],
      select: { commenterId: true },
    }),
  ]);

  const dailyDMs = await Promise.all(
    Array.from({ length: 7 }, (_, idx) => {
      const i = 6 - idx;
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return prisma.dmLog
        .count({
          where: { workspaceId, status: "SENT", createdAt: { gte: dayStart, lt: dayEnd }, ...accountFilter },
        })
        .then((count) => ({ date: dayStart.toLocaleDateString("en-US", { weekday: "short" }), count }));
    })
  );

  const monthlyStatusSummary = summarizeDmStatuses(
    dmStatusCountsThisMonth.map((row) => ({ status: row.status, _count: row._count._all }))
  );
  const topKeywords = normalizeTopKeywords(
    topKeywordRows.map((row) => ({ matchedKeyword: row.matchedKeyword, _count: row._count._all }))
  );

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || null;

  const effectivePlan = workspace ? getEffectivePlan(workspace) : null;
  const planLimits = effectivePlan ? getPlanLimits(effectivePlan) : null;

  return {
    userName: firstName,
    contactsCount: contactRows.length,
    totalAutomations,
    activeAutomations,
    dmsSentToday,
    dmsSentWeek,
    dmsSentMonth,
    dmsSkippedMonth: monthlyStatusSummary.skipped,
    dmsFailedMonth: monthlyStatusSummary.failed,
    totalDMs,
    clicksThisMonth,
    totalClicks,
    ctrThisMonth: calculateCtr(clicksThisMonth, dmsSentMonth),
    plan: effectivePlan ?? "FREE",
    dmQuota: planLimits
      ? { used: workspace!.dmsSentThisPeriod, limit: planLimits.maxDmsPerMonth === Infinity ? null : planLimits.maxDmsPerMonth }
      : null,
    instagramAccounts,
    selectedInstagramAccountId: selectedAccountId,
    topKeywords,
    dailyDMs,
    recentLogs,
  };
}
