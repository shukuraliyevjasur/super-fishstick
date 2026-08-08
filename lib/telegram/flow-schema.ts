/**
 * Wire schema for flow steps.
 *
 * Separate from `flow-types.ts` on purpose: that module parses what is already
 * in the database and is deliberately forgiving, dropping anything malformed so
 * a bad row cannot crash the worker. This one guards what comes *in* from a
 * client and is deliberately strict, because the cheapest place to reject a
 * broken flow is before it is stored.
 */

import { z } from "zod";

export const flowOptionSchema = z.object({
  label: z.string().min(1).max(64),
  nextStepId: z.string().min(1).max(64).nullable(),
});

export const flowStepSchema = z.object({
  id: z.string().min(1).max(64),
  // Telegram's own cap is 4096. Staying under it here means the engine never
  // has to decide what to do with a message the API will refuse.
  message: z.string().max(4000),
  options: z.array(flowOptionSchema).max(8).optional(),
  saveAnswerAs: z.string().min(1).max(64).optional(),
  nextStepId: z.string().min(1).max(64).nullable().optional(),
});

export const flowStepsSchema = z.array(flowStepSchema).max(100);
