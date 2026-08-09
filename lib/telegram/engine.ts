/**
 * Telegram sending primitives shared by the queue worker and the test send.
 *
 * Extracted so D4's "test send through the real bot" is literally the same code
 * path a real customer hits, not a second implementation that can drift. A
 * preview that diverges from the bot is worse than no preview — it tells you
 * the funnel works when it does not.
 *
 * Kept free of BullMQ imports so an API route can call it without pulling the
 * queue runtime into a serverless function.
 */

import type { Bot } from "grammy";
import {
  getSharedBot,
  reserveTelegramSlot,
  sendMessage,
  type TelegramSendResult,
} from "@/lib/telegram/client";
import type { FlowStep } from "@/lib/telegram/flow-types";
import { renderMessageWithoutLink } from "@/lib/tracking/message";
import { prisma } from "@/lib/db/client";

export const CALLBACK_PREFIX = "opt:";

/**
 * Buttons carry their option's index, not its label: `callback_data` is capped
 * at 64 bytes and Uzbek labels are UTF-8, so a readable label can silently
 * exceed the cap and Telegram rejects the whole message.
 */
export function buildKeyboard(step: FlowStep) {
  if (!step.options?.length) return undefined;
  return {
    inline_keyboard: step.options.map((option, index) => [
      { text: option.label, callback_data: `${CALLBACK_PREFIX}${index}` },
    ]),
  };
}

export interface BotContext {
  bot: Bot;
  /** Key for the per-bot rate-limiter bucket. "shared" for @replie_bot. */
  rateLimitKey: string;
}

function sharedBotContext(): BotContext {
  return { bot: getSharedBot(), rateLimitKey: "shared" };
}

export async function sendText(
  chatId: number | bigint,
  text: string,
  step?: FlowStep,
  ctx?: BotContext
): Promise<TelegramSendResult> {
  const { bot, rateLimitKey } = ctx ?? sharedBotContext();
  const allowed = await reserveTelegramSlot(rateLimitKey);
  if (!allowed) {
    // Out of budget for this second. Throwing hands it back to the caller —
    // BullMQ can wait without holding a worker slot open; a test send surfaces
    // it to the person who pressed the button.
    throw new Error("Telegram rate limit reached");
  }

  const replyMarkup = step ? buildKeyboard(step) : undefined;

  return sendMessage(
    bot.api,
    typeof chatId === "bigint" ? Number(chatId) : chatId,
    text,
    replyMarkup ? { reply_markup: replyMarkup } : undefined
  );
}

export async function sendStepTo(
  chatId: number | bigint,
  step: FlowStep,
  recipientName: string | null,
  ctx?: BotContext
): Promise<TelegramSendResult> {
  const text = renderMessageWithoutLink({
    message: step.message,
    recipientName,
    platform: "telegram",
  });
  return sendText(chatId, text, step, ctx);
}

/**
 * Open (or restart) a conversation at a flow's entry step and send it.
 *
 * A second start clears previous answers so a half-finished attempt cannot
 * contaminate the new one — which is also what makes repeated test sends behave
 * like a first-time customer every time.
 */
export async function startConversation(opts: {
  workspaceId: string;
  /** Exact bot that the recipient started. Defaults to the shared bot. */
  botId?: string;
  flowId: string;
  entryStep: FlowStep;
  telegramUserId: bigint;
  chatId: number | bigint;
  recipientName: string | null;
  ctx?: BotContext;
}): Promise<TelegramSendResult> {
  await prisma.telegramConversation.upsert({
    where: {
      telegramUserId_workspaceId_botId: {
        telegramUserId: opts.telegramUserId,
        workspaceId: opts.workspaceId,
        botId: opts.botId ?? "shared",
      },
    },
    create: {
      telegramUserId: opts.telegramUserId,
      chatId: BigInt(opts.chatId),
      workspaceId: opts.workspaceId,
      botId: opts.botId ?? "shared",
      flowId: opts.flowId,
      currentStepId: opts.entryStep.id,
      answers: {},
    },
    update: {
      // Refreshed on every start: a chat id can change if someone is migrated
      // to a supergroup, and a broadcast sending to a stale one fails silently.
      chatId: BigInt(opts.chatId),
      flowId: opts.flowId,
      currentStepId: opts.entryStep.id,
      answers: {},
      lastActiveAt: new Date(),
    },
  });

  return sendStepTo(opts.chatId, opts.entryStep, opts.recipientName, opts.ctx);
}
