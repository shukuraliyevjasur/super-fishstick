/**
 * Flow validation (D5).
 *
 * **This is not an optional editor feature.** It is the condition on which the
 * list-with-drill-in editing model was accepted instead of a node canvas (D7).
 * Drill-in means you never see the whole flow at once, so a branch broken three
 * levels down is off-screen. A live test send only exercises the path the
 * builder personally taps, so it does not substitute for this.
 *
 * If you find yourself cutting this for scope, you are also reversing D7 — say
 * that out loud rather than doing it quietly.
 *
 * Everything here is a pure function of the step array, so it runs identically
 * in the editor, on save, and in tests.
 */

import { findStep, type FlowStep } from "@/lib/telegram/flow-types";

export type FlowIssueCode =
  | "EMPTY_FLOW"
  | "DUPLICATE_STEP_ID"
  | "EMPTY_MESSAGE"
  | "BROKEN_LINK"
  | "UNREACHABLE_STEP"
  | "NO_TERMINAL_STATE";

export interface FlowIssue {
  code: FlowIssueCode;
  /** The step the issue belongs to, so the editor can deep-link to it. */
  stepId: string | null;
  /** Which option index, when the issue is about one specific branch. */
  optionIndex?: number;
  message: string;
}

export interface FlowValidation {
  /** Errors only. Warnings do not block a save. */
  valid: boolean;
  errors: FlowIssue[];
  warnings: FlowIssue[];
}

/** Every step id a given step can lead to. */
function outgoing(step: FlowStep): { target: string | null; optionIndex?: number }[] {
  if (step.options?.length) {
    return step.options.map((option, optionIndex) => ({
      target: option.nextStepId,
      optionIndex,
    }));
  }
  return [{ target: step.nextStepId ?? null }];
}

/**
 * Walk forward from the entry step. Anything not visited is unreachable — the
 * failure drill-in is structurally prone to, since an orphaned branch simply
 * never appears on any screen the builder opens.
 */
function reachableFrom(steps: FlowStep[], entryId: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entryId];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);

    const step = findStep(steps, id);
    if (!step) continue;

    for (const { target } of outgoing(step)) {
      if (target && !seen.has(target)) queue.push(target);
    }
  }

  return seen;
}

/**
 * Can this step reach an ending? A path that cannot is a user trapped in a
 * cycle with no way out — the bot keeps asking and never concludes.
 */
function hasTerminal(steps: FlowStep[], entryId: string): boolean {
  const seen = new Set<string>();
  const queue = [entryId];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);

    const step = findStep(steps, id);
    // A dangling target ends the conversation at runtime, so it terminates —
    // it is reported separately as a broken link.
    if (!step) return true;

    for (const { target } of outgoing(step)) {
      if (target === null) return true;
      if (!findStep(steps, target)) return true;
      if (!seen.has(target)) queue.push(target);
    }
  }

  return false;
}

export function validateFlow(steps: FlowStep[]): FlowValidation {
  const errors: FlowIssue[] = [];
  const warnings: FlowIssue[] = [];

  if (steps.length === 0) {
    return {
      valid: false,
      errors: [
        {
          code: "EMPTY_FLOW",
          stepId: null,
          message: "Oqimda birorta ham qadam yo'q.",
        },
      ],
      warnings: [],
    };
  }

  const seenIds = new Set<string>();
  for (const step of steps) {
    if (seenIds.has(step.id)) {
      errors.push({
        code: "DUPLICATE_STEP_ID",
        stepId: step.id,
        message: `Bir xil qadam identifikatori: ${step.id}`,
      });
    }
    seenIds.add(step.id);

    if (step.message.trim().length === 0) {
      errors.push({
        code: "EMPTY_MESSAGE",
        stepId: step.id,
        message: "Qadamda matn yo'q — bot bo'sh xabar yubora olmaydi.",
      });
    }

    for (const { target, optionIndex } of outgoing(step)) {
      if (target !== null && !findStep(steps, target)) {
        errors.push({
          code: "BROKEN_LINK",
          stepId: step.id,
          optionIndex,
          message: `Mavjud bo'lmagan qadamga havola: ${target}`,
        });
      }
    }
  }

  const entry = steps[0];
  const reachable = reachableFrom(steps, entry.id);

  for (const step of steps) {
    if (!reachable.has(step.id)) {
      // A warning, not an error: an orphaned step is usually work in progress,
      // and blocking the save would mean you cannot build a branch before
      // wiring it up. Drill-in is why it must still be *said* out loud.
      warnings.push({
        code: "UNREACHABLE_STEP",
        stepId: step.id,
        message: "Bu qadamga hech qaysi yo'l olib bormaydi.",
      });
    }
  }

  if (!hasTerminal(steps, entry.id)) {
    errors.push({
      code: "NO_TERMINAL_STATE",
      stepId: entry.id,
      message: "Suhbat hech qachon tugamaydi — yakuniy qadam yo'q.",
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
