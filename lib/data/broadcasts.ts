import "server-only";
import { prisma } from "@/lib/db/client";

export type BroadcastSummary = {
  id: string;
  message: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  completedAt: Date | null;
};

export async function getBroadcasts(
  workspaceId: string
): Promise<BroadcastSummary[]> {
  return prisma.telegramBroadcast.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      message: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      failedCount: true,
      createdAt: true,
      completedAt: true,
    },
  });
}
