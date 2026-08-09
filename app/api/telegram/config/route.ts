import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getOwnBotStatus } from "@/lib/telegram/own-bot";

export const dynamic = "force-dynamic";

/**
 * Deployment-wide Telegram settings the campaign builder needs (T10).
 *
 * Returns the workspace's effective @username: own bot if configured, shared
 * bot otherwise. This is what the campaign deep link is built from.
 * The token itself never leaves the server.
 */
export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const ownBot = await getOwnBotStatus(workspaceId);

  const botUsername = ownBot.configured
    ? (ownBot.botUsername ?? null)
    : (process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? null);

  return NextResponse.json({ success: true, botUsername, isOwnBot: ownBot.configured });
}
