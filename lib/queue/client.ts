/**
 * BullMQ Queue Client
 *
 * Provides the DM processing queue and Redis connections for BullMQ.
 * Two named singletons: web (fail-fast) and worker (persistent, maxRetriesPerRequest: null).
 */

import { Queue } from "bullmq";
import Redis from "ioredis";

let webConn: Redis | null = null;
let workerConn: Redis | null = null;

function isAlive(c: Redis | null): c is Redis {
  return c !== null && c.status !== "end" && c.status !== "close";
}

export function getRedisConnection(): Redis {
  if (!isAlive(webConn)) {
    webConn = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 500, 1500)),
    });
  }
  return webConn;
}

export function getWorkerConnection(): Redis {
  if (!isAlive(workerConn)) {
    workerConn = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      connectTimeout: 5000,
    });
  }
  return workerConn;
}

// ─── DM Queue ───────────────────────────────────────────────────────────────────

export type CommentSource = "WEBHOOK" | "POLLING";

export interface ProcessCommentJob {
  instagramAccountId: string;
  commentId: string;
  commentText: string;
  commenterId: string;
  commenterName?: string;
  mediaId: string;
  requeueAttempt?: number;
  // Which path enqueued this comment. Recorded in the shared ProcessedComment
  // dedup store so the reconciler can tell webhook- from polling-caught comments.
  source?: CommentSource;
}

// Delivered when a user taps an opening DM's button — carries the reveal target.
export interface ProcessPostbackJob {
  instagramAccountId: string;
  userId: string;
  payload: string;
  mid?: string;
  fallback?: boolean;
}

export type DmQueueJob = ProcessCommentJob | ProcessPostbackJob;

export const POSTBACK_JOB_NAME = "process-postback";

let dmQueue: Queue<DmQueueJob> | null = null;

export function getDMQueue(): Queue<DmQueueJob> {
  if (!dmQueue) {
    dmQueue = new Queue<DmQueueJob>("dm-processing", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { age: 300, count: 2000 },
        attempts: 3,
        backoff: {
          type: "custom",
        },
      },
    });
  }
  return dmQueue;
}
