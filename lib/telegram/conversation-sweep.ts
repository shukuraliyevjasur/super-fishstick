/**
 * Conversation TTL sweep (E9).
 *
 * `TelegramConversation` is the hottest new table — a row per person per
 * workspace, written on every reply — and nothing else deletes from it. Flow
 * state older than a month is not a conversation anyone is still having, and
 * keeping it costs a Supabase free tier that has ~0.5 GB to spend.
 *
 * Two properties matter here, both from engineering issue 9:
 *
 * - It reads the `lastActiveAt` index rather than scanning the table.
 * - It deletes in batches with a hard ceiling per run, because this runs inside
 *   the health-check request. An unbounded delete on a table that grew for six
 *   months is exactly the shape that times out, and a timed-out sweep never
 *   deletes anything at all — it just fails a little later each day.
 */

import { prisma } from "@/lib/db/client";

export const CONVERSATION_TTL_DAYS = 30;

const BATCH_SIZE = 500;
/** 10k rows per run. Whatever is left is caught by the next run. */
const MAX_BATCHES = 20;

export interface ConversationSweepResult {
  deleted: number;
  batches: number;
  /** True when the ceiling stopped us — more rows are still eligible. */
  hitCap: boolean;
}

export async function sweepStaleConversations(
  now: Date = new Date()
): Promise<ConversationSweepResult> {
  const cutoff = new Date(now.getTime() - CONVERSATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  let deleted = 0;
  let batches = 0;

  while (batches < MAX_BATCHES) {
    // Select ids first, then delete by id: `deleteMany` cannot be limited, and
    // an unlimited delete is the thing this sweep exists to avoid.
    const stale = await prisma.telegramConversation.findMany({
      where: { lastActiveAt: { lt: cutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (stale.length === 0) break;

    const result = await prisma.telegramConversation.deleteMany({
      where: { id: { in: stale.map((row) => row.id) } },
    });

    deleted += result.count;
    batches += 1;

    // A short batch means the table is drained; no point asking again.
    if (stale.length < BATCH_SIZE) break;
  }

  return { deleted, batches, hitCap: batches >= MAX_BATCHES };
}
