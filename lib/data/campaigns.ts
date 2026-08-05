import "server-only";
import { prisma } from "@/lib/db/client";
import { calculateCtr, normalizeTopKeywords } from "@/lib/tracking/analytics";
import { buildTrackedUrl } from "@/lib/tracking/message";
import { buildReportUrl, generateReportShareSlug } from "@/lib/reports/share";

export type CampaignData = {
  id: string;
  name: string;
  goal: string | null;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  isActive: boolean;
  wholeWordMatch: boolean;
  instagramAccountId: string;
  instagramAccount: { username: string; instagramId: string };
  reportShareSlug: string | null;
  reportShareEnabled: boolean;
  reportUrl: string | null;
  createdAt: Date;
  _count: { dmLogs: number };
  trackedLinks: { id: string; slug: string; label: string | null; destinationUrl: string; trackedUrl: string; _count: { clicks: number } }[];
  analytics: { sent: number; skipped: number; failed: number; clicks: number; ctr: number; topKeywords: { keyword: string; count: number }[] };
};

export async function getCampaigns(
  workspaceId: string,
  accountId?: string | null
): Promise<CampaignData[]> {
  const accountFilter =
    accountId && accountId !== "all" ? { instagramAccountId: accountId } : {};

  const automations = await prisma.automation.findMany({
    where: { workspaceId, ...accountFilter },
    include: {
      instagramAccount: { select: { username: true, instagramId: true } },
      _count: { select: { dmLogs: true } },
      trackedLinks: {
        select: { id: true, slug: true, label: true, destinationUrl: true, _count: { select: { clicks: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Generate missing report slugs (side-effect on GET — matches existing API behaviour)
  const automationsWithReports = await Promise.all(
    automations.map(async (automation) => {
      if (automation.reportShareSlug) return automation;
      const updated = await prisma.automation.update({
        where: { id: automation.id },
        data: { reportShareSlug: generateReportShareSlug() },
        select: { reportShareSlug: true },
      });
      return { ...automation, reportShareSlug: updated.reportShareSlug };
    })
  );

  const [statusCounts, clickCounts, keywordCounts] = await Promise.all([
    prisma.dmLog.groupBy({ by: ["automationId", "status"], where: { workspaceId }, _count: { _all: true } }),
    prisma.linkClick.groupBy({ by: ["automationId"], where: { workspaceId }, _count: { _all: true } }),
    prisma.dmLog.groupBy({
      by: ["automationId", "matchedKeyword"],
      where: { workspaceId, matchedKeyword: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const analyticsMap = new Map<string, { sent: number; skipped: number; failed: number; clicks: number; topKeywords: { keyword: string; count: number }[] }>();
  for (const a of automationsWithReports) {
    analyticsMap.set(a.id, { sent: 0, skipped: 0, failed: 0, clicks: 0, topKeywords: [] });
  }
  for (const row of statusCounts) {
    const item = analyticsMap.get(row.automationId);
    if (!item) continue;
    if (row.status === "SENT") item.sent += row._count._all;
    if (row.status === "FAILED") item.failed += row._count._all;
    if (row.status.startsWith("SKIPPED_")) item.skipped += row._count._all;
  }
  for (const row of clickCounts) {
    const item = analyticsMap.get(row.automationId);
    if (item) item.clicks = row._count._all;
  }
  for (const a of automationsWithReports) {
    const item = analyticsMap.get(a.id);
    if (!item) continue;
    item.topKeywords = normalizeTopKeywords(
      keywordCounts.filter((r) => r.automationId === a.id).map((r) => ({ matchedKeyword: r.matchedKeyword, _count: r._count._all })),
      3
    );
  }

  return automationsWithReports.map((a) => {
    const item = analyticsMap.get(a.id) ?? { sent: 0, skipped: 0, failed: 0, clicks: 0, topKeywords: [] };
    return {
      ...a,
      trackedLinks: a.trackedLinks.map((link) => ({ ...link, trackedUrl: buildTrackedUrl(link.slug) })),
      reportUrl: a.reportShareSlug ? buildReportUrl(a.reportShareSlug) : null,
      analytics: { ...item, ctr: calculateCtr(item.clicks, item.sent) },
    };
  });
}
