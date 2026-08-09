import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageWorkspace, getCurrentWorkspaceContext } from "@/lib/workspace-access";
import {
  setWorkspaceBotToken,
  clearWorkspaceBotToken,
  getOwnBotStatus,
} from "@/lib/telegram/own-bot";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether this workspace has an own bot configured. Token never leaves the server. */
export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const status = await getOwnBotStatus(context.workspaceId);
  return NextResponse.json({ success: true, ...status });
}

const saveSchema = z.object({
  token: z.string().min(1),
});

/**
 * Validate and save an own bot token.
 *
 * Calls Telegram's getMe to confirm the token is valid before writing anything.
 * Returns the bot's @username on success so the UI can show confirmation.
 */
export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can configure the bot" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "token is required" }, { status: 400 });
  }

  try {
    const botUsername = await setWorkspaceBotToken(context.workspaceId, parsed.data.token);
    return NextResponse.json({ success: true, botUsername });
  } catch {
    // Telegram rejected the token (invalid, revoked, or unreachable).
    return NextResponse.json(
      { success: false, error: "Invalid bot token — check it in BotFather and try again" },
      { status: 422 }
    );
  }
}

/**
 * Remove the workspace's own bot token.
 *
 * Never remove it mid-broadcast: a running job needs this token to finish and
 * must not fall back to the shared bot if a user disconnects it in another tab.
 */
export async function DELETE() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can configure the bot" },
      { status: 403 }
    );
  }

  const sending = await prisma.telegramBroadcast.count({
    where: { workspaceId: context.workspaceId, status: "SENDING" },
  });
  if (sending > 0) {
    return NextResponse.json(
      { success: false, error: "broadcast_in_progress" },
      { status: 409 }
    );
  }

  await clearWorkspaceBotToken(context.workspaceId);
  return NextResponse.json({ success: true });
}
