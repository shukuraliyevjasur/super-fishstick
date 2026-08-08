/**
 * Telegram client built on grammY.
 *
 * Provides the shared bot instance and per-workspace custom bot instances.
 * Error mapping (T7) and rate limiting (T13) are integrated here so every
 * call site gets them for free.
 */

import { Bot, GrammyError, type Api } from "grammy";
import { getRedisConnection } from "@/lib/queue/client";

// ─── Rate limiting (T13) ─────────────────────────────────────────────────────
// Telegram's global limit: 30 messages/second per bot. Use the same atomic
// Lua script as the Instagram rate limiter but with a different key prefix,
// cap, and window.

const TG_RATE_LIMIT_MAX = 30;
const TG_RATE_LIMIT_WINDOW = 1; // 1 second

const RESERVE_SLOT_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local max = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

if current >= max then
  return {0, current}
end

local next_count = redis.call("INCR", KEYS[1])
if next_count == 1 then
  redis.call("EXPIRE", KEYS[1], ttl)
end

return {1, next_count}
`;

export async function reserveTelegramSlot(botId: string): Promise<boolean> {
  const redis = getRedisConnection();
  const key = `rate:tg:${botId}`;
  const result = await redis.eval(
    RESERVE_SLOT_SCRIPT,
    1,
    key,
    TG_RATE_LIMIT_MAX,
    TG_RATE_LIMIT_WINDOW
  );
  const values = Array.isArray(result) ? result : [];
  return Number(values[0]) === 1;
}

// ─── Error mapping (T7) ──────────────────────────────────────────────────────

export type TelegramSendResult =
  | { ok: true; messageId: number }
  | { ok: false; code: TelegramErrorCode; retryAfter?: number };

export type TelegramErrorCode =
  | "BLOCKED"       // 403 — user blocked the bot
  | "UNAUTHORIZED"  // 401 — bot token invalid/revoked
  | "RATE_LIMITED"  // 429 — too many requests
  | "BAD_REQUEST"   // 400 — malformed message
  | "UNKNOWN";      // anything else

function mapGrammyError(err: GrammyError): TelegramSendResult {
  const status = err.error_code;
  if (status === 403) return { ok: false, code: "BLOCKED" };
  if (status === 401) return { ok: false, code: "UNAUTHORIZED" };
  if (status === 429) {
    const retryAfter = (err.parameters as { retry_after?: number })?.retry_after;
    return { ok: false, code: "RATE_LIMITED", retryAfter };
  }
  if (status === 400) return { ok: false, code: "BAD_REQUEST" };
  return { ok: false, code: "UNKNOWN" };
}

// ─── Bot instances ───────────────────────────────────────────────────────────

let sharedBot: Bot | null = null;

export function getSharedBot(): Bot {
  if (!sharedBot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
    sharedBot = new Bot(token);
  }
  return sharedBot;
}

export function createCustomBot(token: string): Bot {
  return new Bot(token);
}

// ─── Sending helpers ─────────────────────────────────────────────────────────

export async function sendMessage(
  api: Api,
  chatId: number | string,
  text: string,
  options?: Parameters<Api["sendMessage"]>[2]
): Promise<TelegramSendResult> {
  try {
    const msg = await api.sendMessage(chatId, text, options);
    return { ok: true, messageId: msg.message_id };
  } catch (err) {
    if (err instanceof GrammyError) return mapGrammyError(err);
    return { ok: false, code: "UNKNOWN" };
  }
}

export function getWebhookSecretToken(): string {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is required");
  return secret;
}
