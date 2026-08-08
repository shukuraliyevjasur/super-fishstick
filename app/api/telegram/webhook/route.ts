import { NextRequest, NextResponse } from "next/server";
import { getTelegramQueue, TELEGRAM_UPDATE_JOB_NAME } from "@/lib/queue/client";
import { getWebhookSecretToken } from "@/lib/telegram/client";

/**
 * Telegram webhook endpoint (T1, T5).
 *
 * Verifies the X-Telegram-Bot-Api-Secret-Token header, enqueues the update,
 * and returns 200 immediately. Telegram retries on non-2xx, so returning fast
 * is important even if downstream processing fails.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || secret !== getWebhookSecretToken()) {
    return new NextResponse(null, { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Enqueue and acknowledge. A 200 with the update dropped is better than a 500
  // that makes Telegram redeliver the same update on a schedule we do not
  // control — the failure is recorded, and the user's next message still works.
  try {
    await getTelegramQueue().add(TELEGRAM_UPDATE_JOB_NAME, { update });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Telegram Webhook] Failed to enqueue update:", message);
  }

  return new NextResponse(null, { status: 200 });
}
