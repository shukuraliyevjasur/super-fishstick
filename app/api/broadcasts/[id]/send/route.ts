import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";
import {
  BROADCAST_JOB_NAME,
  getTelegramQueue,
} from "@/lib/queue/client";
import { enrollRecipients, MAX_BROADCAST_RECIPIENTS } from "@/lib/telegram/broadcast";
import { getOwnBotStatus } from "@/lib/telegram/own-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

/** The word the sender must type to confirm. Deliberately not "yes". */
export const CONFIRMATION_WORD = "YUBORISH";

const sendSchema = z.object({
  confirm: z.string(),
  /** Echoed back from the preview, so a changed audience aborts the send. */
  expectedRecipients: z.number().int().nonnegative().optional(),
});

/**
 * Fire a broadcast (T8).
 *
 * Irreversible: a sent message cannot be unsent. Three things guard it —
 * a typed confirmation word, a recipient count echoed from the preview, and a
 * status check that makes a double-submit a no-op rather than a second blast.
 *
 * Recipients are enrolled here, before any sending, so the audience is frozen
 * at the moment of confirmation. Someone who starts a conversation while the
 * broadcast runs is not swept into it half-way through.
 */
export async function POST(request: NextRequest, { params }: RouteProps) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
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

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 }
    );
  }

  if (parsed.data.confirm !== CONFIRMATION_WORD) {
    return NextResponse.json(
      { success: false, error: "Confirmation word does not match" },
      { status: 400 }
    );
  }

  // A draft can outlive its bot configuration. Refuse rather than let a queued
  // broadcast use the shared bot after the workspace disconnected its own one.
  const ownBot = await getOwnBotStatus(context.workspaceId);
  if (!ownBot.configured || !ownBot.botId) {
    return NextResponse.json(
      { success: false, error: "no_own_bot" },
      { status: 403 }
    );
  }

  const broadcast = await prisma.telegramBroadcast.findFirst({
    where: { id, workspaceId: context.workspaceId },
    select: { id: true, status: true, flowId: true, botId: true },
  });

  if (!broadcast) {
    return NextResponse.json(
      { success: false, error: "Broadcast not found" },
      { status: 404 }
    );
  }

  // A double-submit must not start a second run. Already-sending is reported as
  // success, because from the caller's point of view the send did happen.
  if (broadcast.status !== "DRAFT") {
    return NextResponse.json(
      { success: true, alreadyStarted: true, status: broadcast.status },
      { status: 200 }
    );
  }

  // A draft belongs to the bot that collected its preview audience. Replacing
  // a bot requires composing again; the new bot has no right to message the
  // previous bot's contacts.
  if (broadcast.botId !== ownBot.botId) {
    return NextResponse.json(
      { success: false, error: "bot_changed" },
      { status: 409 }
    );
  }

  const enrolled = await enrollRecipients(
    broadcast.id,
    context.workspaceId,
    broadcast.botId,
    broadcast.flowId
  );

  // The audience moved between preview and confirm. Abort rather than send to
  // a list the sender never saw.
  if (
    parsed.data.expectedRecipients !== undefined &&
    parsed.data.expectedRecipients !== enrolled
  ) {
    await prisma.telegramBroadcastRecipient.deleteMany({
      where: { broadcastId: broadcast.id },
    });
    return NextResponse.json(
      {
        success: false,
        error: "Audience changed since the preview",
        expected: parsed.data.expectedRecipients,
        actual: enrolled,
      },
      { status: 409 }
    );
  }

  if (enrolled === 0) {
    return NextResponse.json(
      { success: false, error: "No recipients" },
      { status: 422 }
    );
  }

  await prisma.telegramBroadcast.update({
    where: { id: broadcast.id },
    data: {
      status: "SENDING",
      startedAt: new Date(),
      totalRecipients: enrolled,
    },
  });

  await getTelegramQueue().add(BROADCAST_JOB_NAME, { broadcastId: broadcast.id });

  return NextResponse.json({
    success: true,
    recipients: enrolled,
    limit: MAX_BROADCAST_RECIPIENTS,
  });
}
