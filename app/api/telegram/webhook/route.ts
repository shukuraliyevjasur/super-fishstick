import { NextRequest, NextResponse } from "next/server";
import { getWebhookSecretToken } from "@/lib/telegram/client";

/**
 * Telegram webhook endpoint (T1).
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

  // TODO (S2): parse the update, resolve workspace from /start payload,
  // and enqueue a Telegram job. For now, log and acknowledge.
  console.log("[Telegram Webhook] Update received:", JSON.stringify(update).slice(0, 200));

  return new NextResponse(null, { status: 200 });
}
