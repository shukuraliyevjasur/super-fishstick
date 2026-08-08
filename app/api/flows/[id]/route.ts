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

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

const updateFlowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  steps: flowStepsSchema.optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: RouteProps) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Scoped by workspace, not just by id: an id from another workspace must read
  // as absent rather than forbidden.
  const flow = await prisma.telegramFlow.findFirst({
    where: { id, workspaceId },
    select: {
      id: true,
      name: true,
      steps: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!flow) {
    return NextResponse.json(
      { success: false, error: "Flow not found" },
      { status: 404 }
    );
  }

  const steps = parseFlowSteps(flow.steps);

  return NextResponse.json({
    success: true,
    flow: { ...flow, steps },
    validation: validateFlow(steps),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteProps) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can edit flows" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.telegramFlow.findFirst({
    where: { id, workspaceId: context.workspaceId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Flow not found" },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = updateFlowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // D5: errors block the save. Warnings do not — you have to be able to build a
  // branch before wiring it up — but they come back either way so the editor can
  // surface them.
  let validation = null;
  if (parsed.data.steps) {
    validation = validateFlow(parseFlowSteps(parsed.data.steps));
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: "Flow is not valid", validation },
        { status: 422 }
      );
    }
  }

  const flow = await prisma.telegramFlow.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.steps !== undefined ? { steps: parsed.data.steps } : {}),
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
    },
    select: { id: true, name: true, steps: true, isActive: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, flow, validation });
}

export async function DELETE(_request: NextRequest, { params }: RouteProps) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can delete flows" },
      { status: 403 }
    );
  }

  const { id } = await params;

  // deleteMany, not delete: it is scoped by workspace in one statement, and a
  // miss returns count 0 instead of throwing.
  const result = await prisma.telegramFlow.deleteMany({
    where: { id, workspaceId: context.workspaceId },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { success: false, error: "Flow not found" },
      { status: 404 }
    );
  }

  // Conversations cascade with the flow (schema onDelete: Cascade), so a live
  // conversation on a deleted flow cannot be left pointing at nothing.
  return NextResponse.json({ success: true });
}
