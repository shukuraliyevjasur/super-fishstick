/**
 * Broadcast (T8, E8).
 *
 * Sending to an audience is irreversible in both directions: a sent message
 * cannot be unsent, and a run abandoned halfway leaves half the audience
 * messaged. So the design is checkpointed rather than fast.
 *
 * Every recipient is written to the database *before* any sending starts, and
 * each one is marked as it completes. A crash, a redeploy, or a rate limit
 * resumes from the pending rows — it never re-reads "who should get this" and
 * therefore never double-sends.
 *
 * E8: recipients are cursor-paginated rather than loaded at once, and capped
 * per workspace. The Instagram queue shares this process's memory, so a
 * workspace with a large audience must not be able to starve it.
 */

import { prisma } from "@/lib/db/client";
import { sendText, type BotContext } from "@/lib/telegram/engine";
import { getWorkspaceBot } from "@/lib/telegram/own-bot";

/** Per-workspace ceiling (E8). Beyond this, a broadcast is refused outright. */
export const MAX_BROADCAST_RECIPIENTS = 10_000;

/** Rows read per page while enrolling. */
const ENROLL_PAGE_SIZE = 500;

/** Recipients attempted per batch before the counters are written back. */
const SEND_BATCH_SIZE = 25;

export type BroadcastStatus = "DRAFT" | "SENDING" | "COMPLETED" | "FAILED";

function audienceWhere(workspaceId: string, flowId: string | null) {
  return flowId ? { workspaceId, flowId } : { workspaceId };
}

/** How many people a broadcast would reach. Shown in the preview before send. */
export async function countAudience(
  workspaceId: string,
  flowId: string | null
): Promise<number> {
  return prisma.telegramConversation.count({
    where: audienceWhere(workspaceId, flowId),
  });
}

/**
 * Write one recipient row per audience member.
 *
 * Cursor-paginated by id (E8) so memory stays flat regardless of audience size,
 * and `skipDuplicates` makes a re-run idempotent: enrolling twice cannot enroll
 * anyone twice, which is what the unique index on (broadcastId, telegramUserId)
 * is there to guarantee.
 */
export async function enrollRecipients(
  broadcastId: string,
  workspaceId: string,
  flowId: string | null
): Promise<number> {
  let cursor: string | undefined;
  let enrolled = 0;

  while (enrolled < MAX_BROADCAST_RECIPIENTS) {
    const page = await prisma.telegramConversation.findMany({
      where: audienceWhere(workspaceId, flowId),
      select: { id: true, telegramUserId: true, chatId: true },
      orderBy: { id: "asc" },
      take: ENROLL_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (page.length === 0) break;

    const room = MAX_BROADCAST_RECIPIENTS - enrolled;
    const slice = page.slice(0, room);

    await prisma.telegramBroadcastRecipient.createMany({
      data: slice.map((row) => ({
        broadcastId,
        telegramUserId: row.telegramUserId,
        chatId: row.chatId,
      })),
      skipDuplicates: true,
    });

    enrolled += slice.length;
    cursor = page[page.length - 1].id;

    if (page.length < ENROLL_PAGE_SIZE) break;
  }

  return enrolled;
}

export interface BroadcastBatchResult {
  sent: number;
  failed: number;
  /** Pending rows left after this batch. Zero means the run is done. */
  remaining: number;
  /** Set when Telegram asked us to back off; the caller should retry later. */
  retryAfterMs?: number;
}

/**
 * Attempt one batch of pending recipients.
 *
 * Each row is marked immediately after its own send, not in a bulk update at
 * the end. A crash between two sends therefore loses at most the knowledge of
 * one message, and the resumed run re-sends at most that one — the failure mode
 * is a duplicate to a single person rather than a second blast to everyone.
 */
export async function sendBroadcastBatch(
  broadcastId: string
): Promise<BroadcastBatchResult> {
  const broadcast = await prisma.telegramBroadcast.findUnique({
    where: { id: broadcastId },
    select: { message: true, workspaceId: true },
  });

  if (!broadcast) return { sent: 0, failed: 0, remaining: 0 };

  const workspaceBot = await getWorkspaceBot(broadcast.workspaceId);
  const ctx: BotContext = {
    bot: workspaceBot.bot,
    rateLimitKey: workspaceBot.rateLimitKey,
  };

  const pending = await prisma.telegramBroadcastRecipient.findMany({
    where: { broadcastId, status: "PENDING" },
    orderBy: { id: "asc" },
    take: SEND_BATCH_SIZE,
    select: { id: true, chatId: true },
  });

  let sent = 0;
  let failed = 0;
  let retryAfterMs: number | undefined;

  for (const recipient of pending) {
    let result;
    try {
      result = await sendText(recipient.chatId, broadcast.message, undefined, ctx);
    } catch {
      // Our own rate limiter refused a slot. Leave the row PENDING and stop —
      // burning through the rest of the batch would only deepen the backlog.
      retryAfterMs = 1000;
      break;
    }

    if (result.ok) {
      await prisma.telegramBroadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      sent += 1;
      continue;
    }

    // Telegram's own back-off. Stop the batch and honour retry_after rather
    // than marking these people failed — they have not been tried properly.
    if (result.code === "RATE_LIMITED") {
      retryAfterMs = (result.retryAfter ?? 1) * 1000;
      break;
    }

    await prisma.telegramBroadcastRecipient.update({
      where: { id: recipient.id },
      data: {
        // BLOCKED is not a failure to fix — that person blocked the bot, and
        // separating it keeps the failure count meaningful.
        status: result.code === "BLOCKED" ? "BLOCKED" : "FAILED",
        error: result.code,
      },
    });
    failed += 1;
  }

  const [sentTotal, failedTotal, remaining] = await Promise.all([
    prisma.telegramBroadcastRecipient.count({ where: { broadcastId, status: "SENT" } }),
    prisma.telegramBroadcastRecipient.count({
      where: { broadcastId, status: { in: ["FAILED", "BLOCKED"] } },
    }),
    prisma.telegramBroadcastRecipient.count({
      where: { broadcastId, status: "PENDING" },
    }),
  ]);

  await prisma.telegramBroadcast.update({
    where: { id: broadcastId },
    data: {
      sentCount: sentTotal,
      failedCount: failedTotal,
      ...(remaining === 0
        ? { status: "COMPLETED", completedAt: new Date() }
        : {}),
    },
  });

  return { sent, failed, remaining, retryAfterMs };
}
