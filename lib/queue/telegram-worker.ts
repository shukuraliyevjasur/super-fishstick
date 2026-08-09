/**
 * Telegram update processor (T5, T6).
 *
 * Runs the conversational flow: `/start` with a campaign id opens a
 * conversation, replies advance it, and every path that is not a valid answer
 * still gets a reply. The bot never goes silent — that is T6, and it is the
 * whole reason the no-match branch re-sends the prompt instead of returning.
 *
 * State lives in Postgres (`TelegramConversation`), not Redis: Redis is
 * `noeviction` and holds the job queue, so unbounded chat state there can wedge
 * the queue and stop Instagram DMs for everyone. See issue 3 in the roadmap.
 */

import { Worker } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/client";
import {
  BROADCAST_JOB_NAME,
  getTelegramQueue,
  getWorkerConnection,
  type ProcessBroadcastJob,
  type ProcessTelegramUpdateJob,
  type TelegramQueueJob,
} from "@/lib/queue/client";
import { sendBroadcastBatch } from "@/lib/telegram/broadcast";
import { getSharedBot } from "@/lib/telegram/client";
import {
  CALLBACK_PREFIX,
  sendStepTo,
  sendText,
  startConversation,
  type BotContext,
} from "@/lib/telegram/engine";
import { getWorkspaceBot } from "@/lib/telegram/own-bot";
import { isLinkPayload, redeemLinkCode } from "@/lib/telegram/link";
import { BOT_COPY } from "@/lib/telegram/copy";
import {
  expectsFreeText,
  findStep,
  getEntryStep,
  matchOption,
  parseFlowSteps,
  type FlowOption,
  type FlowStep,
} from "@/lib/telegram/flow-types";


const START_COMMAND = "/start";

// ─── Update parsing ─────────────────────────────────────────────────────────────

export interface IncomingEvent {
  chatId: number;
  telegramUserId: bigint;
  firstName: string | null;
  /** Typed text. Null when the user tapped a button instead. */
  text: string | null;
  /** Index into the current step's options. Null when the user typed. */
  optionIndex: number | null;
  /** Present only for taps — Telegram spins a loading state until it is answered. */
  callbackQueryId: string | null;
}

/**
 * Normalize the two update shapes the flow engine acts on — a text message and
 * an inline-keyboard tap — into one event.
 *
 * Everything else (edits, joins, channel posts, stickers) returns null and is
 * ignored rather than errored, so an unexpected update type cannot fail a job
 * and retry forever.
 */
export function parseIncomingEvent(update: unknown): IncomingEvent | null {
  if (typeof update !== "object" || update === null) return null;
  const root = update as Record<string, unknown>;

  const callback = root.callback_query;
  if (typeof callback === "object" && callback !== null) {
    return parseCallbackQuery(callback as Record<string, unknown>);
  }

  const message = root.message;
  if (typeof message === "object" && message !== null) {
    return parseTextMessage(message as Record<string, unknown>);
  }

  return null;
}

function parseTextMessage(record: Record<string, unknown>): IncomingEvent | null {
  const text = record.text;
  const from = record.from as Record<string, unknown> | undefined;
  const chat = record.chat as Record<string, unknown> | undefined;

  if (typeof text !== "string") return null;
  if (!from || typeof from.id !== "number") return null;
  if (!chat || typeof chat.id !== "number") return null;

  return {
    chatId: chat.id,
    telegramUserId: BigInt(from.id),
    firstName: typeof from.first_name === "string" ? from.first_name : null,
    text,
    optionIndex: null,
    callbackQueryId: null,
  };
}

function parseCallbackQuery(record: Record<string, unknown>): IncomingEvent | null {
  const from = record.from as Record<string, unknown> | undefined;
  const message = record.message as Record<string, unknown> | undefined;
  const chat = message?.chat as Record<string, unknown> | undefined;
  const data = record.data;

  if (!from || typeof from.id !== "number") return null;
  if (!chat || typeof chat.id !== "number") return null;
  if (typeof data !== "string" || !data.startsWith(CALLBACK_PREFIX)) return null;

  const index = Number.parseInt(data.slice(CALLBACK_PREFIX.length), 10);
  if (!Number.isInteger(index) || index < 0) return null;

  return {
    chatId: chat.id,
    telegramUserId: BigInt(from.id),
    firstName: typeof from.first_name === "string" ? from.first_name : null,
    text: null,
    optionIndex: index,
    callbackQueryId: typeof record.id === "string" ? record.id : null,
  };
}

/** `/start abc123` → `abc123`. `/start` alone → null. */
export function parseStartPayload(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed !== START_COMMAND && !trimmed.startsWith(`${START_COMMAND} `)) {
    return null;
  }
  const payload = trimmed.slice(START_COMMAND.length).trim();
  return payload.length > 0 ? payload : null;
}

export function isStartCommand(text: string): boolean {
  const trimmed = text.trim();
  return trimmed === START_COMMAND || trimmed.startsWith(`${START_COMMAND} `);
}

// ─── Sending ────────────────────────────────────────────────────────────────────

/** Sending lives in lib/telegram/engine.ts so the test send (D4) shares it. */
async function send(chatId: number, text: string, step?: FlowStep, ctx?: BotContext) {
  return sendText(chatId, text, step, ctx);
}

async function sendStep(event: IncomingEvent, step: FlowStep, ctx?: BotContext) {
  return sendStepTo(event.chatId, step, event.firstName, ctx);
}

/**
 * Clear the tap's loading spinner. Best-effort: the answer is cosmetic, and a
 * failure here must not cost the user their actual reply.
 */
async function acknowledgeTap(event: IncomingEvent, ctx?: BotContext) {
  if (!event.callbackQueryId) return;
  const bot = ctx?.bot ?? getSharedBot();
  try {
    await bot.api.answerCallbackQuery(event.callbackQueryId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log("[Telegram Worker] answerCallbackQuery failed:", message);
  }
}

// ─── /start (T5) ────────────────────────────────────────────────────────────────

async function handleStart(event: IncomingEvent, payload: string | null) {
  // D4: the builder linking their own Telegram so a test send has somewhere to
  // go. Checked before the campaign lookup, since a link code is not a
  // campaign id and must never be reported as a dead link.
  if (payload && isLinkPayload(payload)) {
    const userId = await redeemLinkCode(
      payload,
      event.telegramUserId,
      BigInt(event.chatId)
    );
    // No workspace known yet — use the shared bot for this meta-reply.
    await send(event.chatId, userId ? BOT_COPY.linked : BOT_COPY.linkFailed);
    return;
  }

  if (!payload) {
    // No campaign id. Someone opened the bot directly, or tapped /start again
    // mid-conversation — resume where they were rather than dead-ending them.
    const resumed = await resumeConversation(event);
    if (!resumed) await send(event.chatId, BOT_COPY.noPayload);
    return;
  }

  const automation = await prisma.automation.findUnique({
    where: { id: payload },
    select: {
      id: true,
      workspaceId: true,
      telegramEnabled: true,
      telegramFlow: { select: { id: true, steps: true, isActive: true } },
    },
  });

  // A deleted campaign and a garbage payload are the same thing to the user: a
  // link that no longer works. Distinguishing them would leak whether an id
  // ever existed.
  if (!automation) {
    await send(event.chatId, BOT_COPY.unknownCampaign);
    return;
  }

  // Now we know the workspace — use its configured bot for all remaining sends.
  const workspaceBot = await getWorkspaceBot(automation.workspaceId);
  const ctx: BotContext = { bot: workspaceBot.bot, rateLimitKey: workspaceBot.rateLimitKey };

  // T10: the campaign's own flow, chosen in the builder, is authoritative. This
  // replaces the placeholder rule recorded in D9.
  //
  // The workspace fallback is kept for one case only: a campaign created before
  // the picker existed, which has telegramEnabled false and no flow. Dropping it
  // would silently break links already printed in someone's bio.
  const picked =
    automation.telegramFlow && automation.telegramFlow.isActive
      ? automation.telegramFlow
      : null;

  const flow =
    picked ??
    (await prisma.telegramFlow.findFirst({
      where: { workspaceId: automation.workspaceId, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, steps: true },
    }));

  if (!flow) {
    await send(event.chatId, BOT_COPY.noFlow, undefined, ctx);
    return;
  }

  const steps = parseFlowSteps(flow.steps);
  const entry = getEntryStep(steps);
  if (!entry) {
    await send(event.chatId, BOT_COPY.emptyFlow, undefined, ctx);
    return;
  }

  // A second /start restarts the funnel: same person, fresh run, previous
  // answers cleared so a half-finished attempt cannot contaminate this one.
  await startConversation({
    workspaceId: automation.workspaceId,
    flowId: flow.id,
    entryStep: entry,
    telegramUserId: event.telegramUserId,
    chatId: event.chatId,
    recipientName: event.firstName,
    ctx,
  });
}

/** The most recent workspace this user talked to, if any. */
async function loadLatestConversation(telegramUserId: bigint) {
  return prisma.telegramConversation.findFirst({
    where: { telegramUserId },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      currentStepId: true,
      answers: true,
      flow: { select: { steps: true } },
    },
  });
}

async function resumeConversation(event: IncomingEvent): Promise<boolean> {
  const conversation = await loadLatestConversation(event.telegramUserId);
  if (!conversation?.currentStepId) return false;

  const step = findStep(
    parseFlowSteps(conversation.flow.steps),
    conversation.currentStepId
  );
  if (!step) return false;

  const workspaceBot = await getWorkspaceBot(conversation.workspaceId);
  const ctx: BotContext = { bot: workspaceBot.bot, rateLimitKey: workspaceBot.rateLimitKey };
  await sendStep(event, step, ctx);
  return true;
}

// ─── Replies (T6) ───────────────────────────────────────────────────────────────

/**
 * Answers are a flat string map. Kept flat so the column stays queryable and so
 * the S3 editor has one obvious thing to bind a step's `saveAnswerAs` to; a
 * value that somehow is not a string is coerced rather than dropped.
 */
function mergeAnswers(existing: unknown, key: string, value: string): Record<string, string> {
  const base: Record<string, string> = {};
  if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
    for (const [k, v] of Object.entries(existing as Record<string, unknown>)) {
      base[k] = typeof v === "string" ? v : String(v);
    }
  }
  return { ...base, [key]: value };
}

/** Resolve a tap by index, or typed text by label. */
function resolveOption(step: FlowStep, event: IncomingEvent): FlowOption | null {
  if (event.optionIndex !== null) {
    return step.options?.[event.optionIndex] ?? null;
  }
  return event.text !== null ? matchOption(step, event.text) : null;
}

async function handleReply(event: IncomingEvent) {
  const conversation = await loadLatestConversation(event.telegramUserId);

  // No conversation at all — this person is typing at a bot they never
  // started. Tell them how to get in rather than saying nothing.
  if (!conversation) {
    await send(event.chatId, BOT_COPY.noPayload);
    return;
  }

  // Now we know the workspace — use its bot for all remaining sends.
  const workspaceBot = await getWorkspaceBot(conversation.workspaceId);
  const ctx: BotContext = { bot: workspaceBot.bot, rateLimitKey: workspaceBot.rateLimitKey };

  const steps = parseFlowSteps(conversation.flow.steps);
  const step = findStep(steps, conversation.currentStepId);

  // The conversation already ran to the end, or the flow was edited out from
  // under it. Either way there is nothing to advance.
  if (!step) {
    await send(event.chatId, BOT_COPY.finished, undefined, ctx);
    return;
  }

  let nextStepId: string | null | undefined;
  let answer: string | null = null;

  if (expectsFreeText(step) && event.optionIndex === null) {
    answer = event.text;
    nextStepId = step.nextStepId;
  } else {
    const option = resolveOption(step, event);
    if (!option) {
      // T6: the bot must not go silent. Say we did not understand, then re-send
      // the prompt with its keyboard so the options are back in reach. The
      // conversation deliberately does not advance.
      await send(event.chatId, BOT_COPY.noMatch, undefined, ctx);
      await sendStep(event, step, ctx);
      await touch(conversation.id);
      return;
    }
    answer = option.label;
    nextStepId = option.nextStepId;
  }

  const answers =
    step.saveAnswerAs && answer !== null
      ? mergeAnswers(conversation.answers, step.saveAnswerAs, answer)
      : undefined;

  const nextStep = findStep(steps, nextStepId ?? null);

  await prisma.telegramConversation.update({
    where: { id: conversation.id },
    data: {
      currentStepId: nextStep?.id ?? null,
      lastActiveAt: new Date(),
      ...(answers ? { answers } : {}),
    },
  });

  if (!nextStep) {
    await send(event.chatId, BOT_COPY.finished, undefined, ctx);
    return;
  }

  await sendStep(event, nextStep, ctx);
}

async function touch(conversationId: string) {
  await prisma.telegramConversation.update({
    where: { id: conversationId },
    data: { lastActiveAt: new Date() },
  });
}

// ─── Entry point ────────────────────────────────────────────────────────────────

export async function processTelegramUpdate(update: unknown): Promise<void> {
  const event = parseIncomingEvent(update);
  if (!event) return;

  // acknowledgeTap runs before we know the workspace. If the conversation is
  // already in the DB we could look it up, but answerCallbackQuery is cosmetic
  // and the extra query is not worth it — the shared bot handles it for now.
  await acknowledgeTap(event);

  if (event.text !== null && isStartCommand(event.text)) {
    await handleStart(event, parseStartPayload(event.text));
    return;
  }

  await handleReply(event);
}

/**
 * One pass over a broadcast, re-enqueued until the audience is drained (T8).
 *
 * Re-enqueueing rather than looping in place means a long broadcast never holds
 * a worker slot for minutes, so an Instagram DM behind it is not stuck waiting
 * on someone's marketing blast.
 */
async function processBroadcast(broadcastId: string): Promise<void> {
  const result = await sendBroadcastBatch(broadcastId);

  if (result.remaining === 0) return;

  await getTelegramQueue().add(
    BROADCAST_JOB_NAME,
    { broadcastId },
    { delay: result.retryAfterMs ?? 1000 }
  );
}

export function createTelegramWorker(): Worker<TelegramQueueJob> {
  const worker = new Worker<TelegramQueueJob>(
    "telegram-processing",
    async (job) => {
      if (job.name === BROADCAST_JOB_NAME) {
        const { broadcastId } = job.data as ProcessBroadcastJob;
        return processBroadcast(broadcastId);
      }
      return processTelegramUpdate((job.data as ProcessTelegramUpdateJob).update);
    },
    {
      connection: getWorkerConnection(),
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[Telegram Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message
    );
    Sentry.captureException(err);
  });

  worker.on("error", (err) => {
    console.error("[Telegram Worker] Worker error:", err.message);
    Sentry.captureException(err);
  });

  return worker;
}
