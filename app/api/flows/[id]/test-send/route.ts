import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { startConversation } from "@/lib/telegram/engine";
import { getLinkForUser } from "@/lib/telegram/link";
import { getEntryStep, parseFlowSteps } from "@/lib/telegram/flow-types";
import { validateFlow } from "@/lib/telegram/flow-validation";
import { getWorkspaceBot } from "@/lib/telegram/own-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ id: string }> };

/**
 * Test send (D4).
 *
 * Runs the flow for real, through the shared bot, into the builder's own
 * Telegram — the same `startConversation` a customer's /start hits. Decision 3
 * of the design review chose this over a simulation precisely because a
 * simulation can diverge from the bot and still look convincing.
 *
 * It really does open a conversation, so tapping the buttons that arrive walks
 * the actual flow. That is the point, and it is why the builder's own Telegram
 * has to be linked first.
 */
export async function POST(_request: NextRequest, { params }: RouteProps) {
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

  const { id } = await params;

  const flow = await prisma.telegramFlow.findFirst({
    where: { id, workspaceId: context.workspaceId },
    select: { id: true, steps: true },
  });

  if (!flow) {
    return NextResponse.json(
      { success: false, error: "Flow not found" },
      { status: 404 }
    );
  }

  const link = await getLinkForUser(session.user.id);
  if (!link) {
    // Not an error the user caused — they simply have not linked yet. The UI
    // turns this into the "connect your Telegram" step rather than a failure.
    return NextResponse.json(
      { success: false, error: "Telegram not linked", needsLink: true },
      { status: 409 }
    );
  }

  const workspaceBot = await getWorkspaceBot(context.workspaceId);
  if (!workspaceBot.isOwn) {
    return NextResponse.json(
      { success: false, error: "Own Telegram bot not connected", needsOwnBot: true },
      { status: 409 }
    );
  }

  const steps = parseFlowSteps(flow.steps);
  const validation = validateFlow(steps);
  const entry = getEntryStep(steps);

  // Refuse to test a flow that cannot be saved. Sending a broken funnel to
  // yourself and watching it half-work is not information.
  if (!validation.valid || !entry) {
    return NextResponse.json(
      { success: false, error: "Flow is not valid", validation },
      { status: 422 }
    );
  }

  try {
    const result = await startConversation({
      workspaceId: context.workspaceId,
      flowId: flow.id,
      entryStep: entry,
      telegramUserId: link.telegramUserId,
      chatId: link.chatId,
      recipientName: session.user.name ?? null,
      botId: workspaceBot.botId,
      ctx: { bot: workspaceBot.bot, rateLimitKey: workspaceBot.rateLimitKey },
    });

    if (!result.ok) {
      // BLOCKED is the common one and is actionable: the builder blocked the
      // bot, and no amount of retrying fixes it.
      return NextResponse.json(
        { success: false, error: "Telegram rejected the message", code: result.code },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
