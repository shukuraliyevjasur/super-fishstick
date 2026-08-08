import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";
import { countAudience, MAX_BROADCAST_RECIPIENTS } from "@/lib/telegram/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createBroadcastSchema = z.object({
  // Telegram's own cap is 4096; staying under it means the send never fails
  // for a reason the composer could have prevented.
  message: z.string().min(1).max(4000),
  /** Null targets everyone in the workspace who has talked to the bot. */
  flowId: z.string().min(1).optional().nullable(),
});

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const broadcasts = await prisma.telegramBroadcast.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      message: true,
      status: true,
      flowId: true,
      totalRecipients: true,
      sentCount: true,
      failedCount: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ success: true, broadcasts });
}

/**
 * Create a broadcast as a DRAFT and report who it would reach (T8).
 *
 * Creating never sends. Sending is a second, separately confirmed call — the
 * preview is the whole point, and a single endpoint that both composes and
 * fires would make the irreversible step one request away from a typo.
 */
export async function POST(request: NextRequest) {
  const [session, context] = await Promise.all([
    auth(),
    getCurrentWorkspaceContext(),
  ]);

  if (!session?.user?.id || !context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can broadcast" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createBroadcastSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const flowId = parsed.data.flowId ?? null;

  if (flowId) {
    const flow = await prisma.telegramFlow.findFirst({
      where: { id: flowId, workspaceId: context.workspaceId },
      select: { id: true },
    });
    if (!flow) {
      return NextResponse.json(
        { success: false, error: "Flow not found" },
        { status: 400 }
      );
    }
  }

  const audience = await countAudience(context.workspaceId, flowId);

  // E8: refuse rather than silently truncate. Someone who thinks they reached
  // 40,000 people and reached 10,000 has been misled by their own tool.
  if (audience > MAX_BROADCAST_RECIPIENTS) {
    return NextResponse.json(
      {
        success: false,
        error: "Audience too large",
        audience,
        limit: MAX_BROADCAST_RECIPIENTS,
      },
      { status: 422 }
    );
  }

  const broadcast = await prisma.telegramBroadcast.create({
    data: {
      workspaceId: context.workspaceId,
      flowId,
      message: parsed.data.message,
      status: "DRAFT",
      totalRecipients: audience,
      createdById: session.user.id,
    },
    select: { id: true, message: true, status: true, totalRecipients: true },
  });

  return NextResponse.json({ success: true, broadcast, audience }, { status: 201 });
}
