import "server-only";
import { prisma } from "@/lib/db/client";
import { getFlows, type FlowSummary } from "@/lib/data/flows";

export type TelegramDashboardData = {
  contacts: number;
  activeFlows: number;
  broadcastMessagesSent: number;
  completedBroadcasts: number;
  flows: FlowSummary[];
};

/**
 * The Telegram home only reports activity attributable to the currently
 * connected bot. A replacement bot cannot contact people who started the old
 * one, so mixing those audiences would make the dashboard misleading.
 */
export async function getTelegramDashboard(
  workspaceId: string,
  botId: string
): Promise<TelegramDashboardData> {
  const [contacts, broadcastAggregate, completedBroadcasts, flows] =
    await Promise.all([
      prisma.telegramConversation.count({ where: { workspaceId, botId } }),
      prisma.telegramBroadcast.aggregate({
        where: { workspaceId, botId },
        _sum: { sentCount: true },
      }),
      prisma.telegramBroadcast.count({
        where: { workspaceId, botId, status: "COMPLETED" },
      }),
      getFlows(workspaceId),
    ]);

  return {
    contacts,
    activeFlows: flows.filter((flow) => flow.isActive).length,
    broadcastMessagesSent: broadcastAggregate._sum.sentCount ?? 0,
    completedBroadcasts,
    flows,
  };
}
