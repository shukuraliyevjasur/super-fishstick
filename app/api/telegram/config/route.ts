import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getOwnBotStatus } from "@/lib/telegram/own-bot";

export const dynamic = "force-dynamic";

/**
 * Deployment-wide Telegram settings the campaign builder needs (T10).
 *
 * Telegram campaigns always use the workspace's own bot. A shared fallback
 * would collect contacts that the workspace can never safely broadcast to.
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

  return NextResponse.json({
    success: true,
    botUsername: ownBot.botUsername,
    isOwnBot: ownBot.configured,
  });
}
