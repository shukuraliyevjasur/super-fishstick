import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";
import { flowStepsSchema } from "@/lib/telegram/flow-schema";
import { validateFlow } from "@/lib/telegram/flow-validation";
import { parseFlowSteps } from "@/lib/telegram/flow-types";
import { getFlowTemplate } from "@/lib/telegram/flow-templates";
import { hasOwnBot } from "@/lib/telegram/own-bot";

// Read-your-writes: a flow you just created must appear immediately.
export const dynamic = "force-dynamic";

const createFlowSchema = z
  .object({
    name: z.string().min(1).max(100),
    // Either start from a template (D3) or supply steps directly.
    templateId: z.string().min(1).max(64).optional(),
    steps: flowStepsSchema.optional(),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => Boolean(d.templateId) || Boolean(d.steps), {
    message: "Choose a template or supply steps",
    path: ["templateId"],
  });

export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!(await hasOwnBot(workspaceId))) {
    return NextResponse.json({ success: false, error: "no_own_bot" }, { status: 403 });
  }

  const flows = await prisma.telegramFlow.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      steps: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { conversations: true } },
    },
  });

  // The list is where a broken flow has to be visible — the editor is the one
  // place you are *not* looking when a funnel silently stops converting.
  const summaries = flows.map((flow) => {
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
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    };
  });

  return NextResponse.json({ success: true, flows: summaries });
}

export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can create flows" },
      { status: 403 }
    );
  }

  if (!(await hasOwnBot(context.workspaceId))) {
    return NextResponse.json({ success: false, error: "no_own_bot" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createFlowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  let steps = parsed.data.steps ?? [];

  if (parsed.data.templateId) {
    const template = getFlowTemplate(parsed.data.templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Unknown template" },
        { status: 400 }
      );
    }
    steps = template.steps;
  }

  const flow = await prisma.telegramFlow.create({
    data: {
      workspaceId: context.workspaceId,
      name: parsed.data.name,
      steps,
      isActive: parsed.data.isActive,
    },
    select: { id: true, name: true, steps: true, isActive: true },
  });

  return NextResponse.json({ success: true, flow }, { status: 201 });
}
