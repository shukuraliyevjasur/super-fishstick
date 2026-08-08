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

import {
  getSharedBot,
  reserveTelegramSlot,
  sendMessage,
  type TelegramSendResult,
} from "@/lib/telegram/client";
import type { FlowStep } from "@/lib/telegram/flow-types";
import { renderMessageWithoutLink } from "@/lib/tracking/message";
import { prisma } from "@/lib/db/client";

const SHARED_BOT_ID = "shared";
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

export async function sendText(
  chatId: number | bigint,
  text: string,
  step?: FlowStep
): Promise<TelegramSendResult> {
  const allowed = await reserveTelegramSlot(SHARED_BOT_ID);
  if (!allowed) {
    // Out of budget for this second. Throwing hands it back to the caller —
    // BullMQ can wait without holding a worker slot open; a test send surfaces
    // it to the person who pressed the button.
    throw new Error("Telegram rate limit reached");
  }

  const bot = getSharedBot();
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
  recipientName: string | null
): Promise<TelegramSendResult> {
  const text = renderMessageWithoutLink({
    message: step.message,
    recipientName,
    platform: "telegram",
  });
  return sendText(chatId, text, step);
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
  flowId: string;
  entryStep: FlowStep;
  telegramUserId: bigint;
  chatId: number | bigint;
  recipientName: string | null;
}): Promise<TelegramSendResult> {
  await prisma.telegramConversation.upsert({
    where: {
      telegramUserId_workspaceId: {
        telegramUserId: opts.telegramUserId,
        workspaceId: opts.workspaceId,
      },
    },
    create: {
      telegramUserId: opts.telegramUserId,
      workspaceId: opts.workspaceId,
      flowId: opts.flowId,
      currentStepId: opts.entryStep.id,
      answers: {},
    },
    update: {
      flowId: opts.flowId,
      currentStepId: opts.entryStep.id,
      answers: {},
      lastActiveAt: new Date(),
    },
  });

  return sendStepTo(opts.chatId, opts.entryStep, opts.recipientName);
}
