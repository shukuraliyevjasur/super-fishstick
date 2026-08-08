import "server-only";
import { prisma } from "@/lib/db/client";
import { parseFlowSteps } from "@/lib/telegram/flow-types";
import { validateFlow } from "@/lib/telegram/flow-validation";

export type FlowSummary = {
  id: string;
  name: string;
  isActive: boolean;
  stepCount: number;
  conversationCount: number;
  /** Errors only. Warnings do not make a flow invalid. */
  valid: boolean;
  errorCount: number;
  warningCount: number;
  updatedAt: Date;
};

/**
 * Flow list for the Flows section.
 *
 * Validation runs per flow here rather than only in the editor, because this
 * list is the one screen where a broken funnel can actually be noticed. Inside
 * the editor you are already looking at the flow you are thinking about; the
 * one that quietly stopped converting is the one you have not opened.
 */
export async function getFlows(workspaceId: string): Promise<FlowSummary[]> {
  const flows = await prisma.telegramFlow.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      steps: true,
      isActive: true,
      updatedAt: true,
      _count: { select: { conversations: true } },
    },
  });

  return flows.map((flow) => {
    const steps = parseFlowSteps(flow.steps);
    const validation = validateFlow(steps);

    return {
      id: flow.id,
      name: flow.name,
      isActive: flow.isActive,
      stepCount: steps.length,
      conversationCount: flow._count.conversations,
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      updatedAt: flow.updatedAt,
    };
  });
}
