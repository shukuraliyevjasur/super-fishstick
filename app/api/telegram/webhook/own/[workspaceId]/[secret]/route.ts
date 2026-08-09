import { NextRequest, NextResponse } from "next/server";
import { getTelegramQueue, TELEGRAM_UPDATE_JOB_NAME } from "@/lib/queue/client";
import { getOwnBotWebhookBotId } from "@/lib/telegram/own-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ workspaceId: string; secret: string }> };

/**
 * Per-workspace Telegram webhook. The high-entropy path and Telegram's secret
 * header must both match the stored hash before an update gets a workspace id.
 */
export async function POST(request: NextRequest, { params }: RouteProps) {
  const { workspaceId, secret } = await params;
  const botId = await getOwnBotWebhookBotId(
    workspaceId,
    secret,
    request.headers.get("x-telegram-bot-api-secret-token")
  );
  if (!botId) return new NextResponse(null, { status: 401 });

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await getTelegramQueue().add(TELEGRAM_UPDATE_JOB_NAME, { update, workspaceId, botId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Telegram Own Bot Webhook] Failed to enqueue update:", message);
  }

  return new NextResponse(null, { status: 200 });
}
