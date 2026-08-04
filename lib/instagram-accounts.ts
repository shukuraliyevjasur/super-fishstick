import { prisma } from "@/lib/db/client";
import { getEffectivePlan, getPlanLimits } from "@/lib/billing/plan";

export async function canConnectInstagramAccount({
  workspaceId,
  instagramId,
}: {
  workspaceId: string;
  instagramId: string;
}) {
  const existingAccount = await prisma.instagramAccount.findUnique({
    where: { instagramId },
    select: { workspaceId: true },
  });

  if (existingAccount && existingAccount.workspaceId !== workspaceId) {
    return {
      allowed: false,
      reason: "already_connected" as const,
    };
  }

  // Already connected to this workspace — reconnecting is allowed (token refresh).
  if (existingAccount?.workspaceId === workspaceId) {
    return { allowed: true, reason: null };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      planExpiresAt: true,
      _count: { select: { instagramAccounts: true } },
    },
  });

  if (!workspace) {
    return { allowed: false, reason: "workspace_not_found" as const };
  }

  const { maxInstagramAccounts } = getPlanLimits(getEffectivePlan(workspace));
  if (workspace._count.instagramAccounts >= maxInstagramAccounts) {
    return { allowed: false, reason: "plan_limit" as const };
  }

  return { allowed: true, reason: null };
}

export async function getWorkspaceInstagramAccount(
  workspaceId: string,
  instagramAccountId?: string | null
) {
  if (instagramAccountId && instagramAccountId !== "all") {
    return prisma.instagramAccount.findFirst({
      where: { id: instagramAccountId, workspaceId },
    });
  }

  return prisma.instagramAccount.findFirst({
    where: { workspaceId },
    orderBy: { connectedAt: "desc" },
  });
}

