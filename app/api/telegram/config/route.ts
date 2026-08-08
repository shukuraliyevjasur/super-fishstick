import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Deployment-wide Telegram settings the campaign builder needs (T10).
 *
 * Only the bot's public @username, which is what a deep link is built from and
 * is visible to anyone who opens the bot. The token stays server-side and is
 * never part of this response.
 *
 * A separate route rather than a field bolted onto /api/flows: the edit page is
 * a client component and cannot read env directly, and the two answer different
 * questions.
 */
export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? null;

  return NextResponse.json({ success: true, botUsername });
}
