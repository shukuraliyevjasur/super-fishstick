/**
 * Flow step schema (T5).
 *
 * `TelegramFlow.steps` is a `Json` column — the whole tree lives in one row, per
 * T3. This module is the only place that knows its shape, so the S3 editor and
 * the runtime engine cannot drift apart.
 *
 * The shape is deliberately small. It carries what the engine needs today and
 * what D5's validation will need to walk: every edge out of a step is either an
 * option's `nextStepId` or the step's own `nextStepId`, and `null` means "this
 * path ends here". A path that ends is a terminal state; a step nothing points
 * at is unreachable. Both are checkable without a second traversal model.
 */

export interface FlowOption {
  /** Button text on the inline keyboard. */
  label: string;
  /** Step to advance to, or null to end the conversation here. */
  nextStepId: string | null;
}

export interface FlowStep {
  id: string;
  /** Message body. Supports {username} and {link}, via lib/tracking/message.ts. */
  message: string;
  /** Inline keyboard. Absent or empty means the step expects free text. */
  options?: FlowOption[];
  /** When set, the user's reply is stored in `conversation.answers` under this key. */
  saveAnswerAs?: string;
  /** Where a free-text step goes next. Ignored when `options` is non-empty. */
  nextStepId?: string | null;
}

/**
 * Steps come out of a `Json` column, so they are `unknown` until proven
 * otherwise — a hand-edited row or a half-migrated flow must not crash the
 * worker. Anything malformed is dropped rather than throwing: a flow with three
 * good steps and one broken one still runs the three.
 */
export function parseFlowSteps(value: unknown): FlowStep[] {
  if (!Array.isArray(value)) return [];

  const steps: FlowStep[] = [];
  for (const raw of value) {
    const step = parseFlowStep(raw);
    if (step) steps.push(step);
  }
  return steps;
}

function parseFlowStep(raw: unknown): FlowStep | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;

  const id = candidate.id;
  const message = candidate.message;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof message !== "string") return null;

  const step: FlowStep = { id, message };

  if (Array.isArray(candidate.options)) {
    const options = candidate.options
      .map(parseFlowOption)
      .filter((option): option is FlowOption => option !== null);
    if (options.length > 0) step.options = options;
  }

  if (typeof candidate.saveAnswerAs === "string" && candidate.saveAnswerAs.length > 0) {
    step.saveAnswerAs = candidate.saveAnswerAs;
  }

  if (typeof candidate.nextStepId === "string" || candidate.nextStepId === null) {
    step.nextStepId = candidate.nextStepId;
  }

  return step;
}

function parseFlowOption(raw: unknown): FlowOption | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;

  const label = candidate.label;
  if (typeof label !== "string" || label.length === 0) return null;

  const nextStepId =
    typeof candidate.nextStepId === "string" ? candidate.nextStepId : null;

  return { label, nextStepId };
}

/** The entry step is the first one in the array. */
export function getEntryStep(steps: FlowStep[]): FlowStep | null {
  return steps[0] ?? null;
}

export function findStep(steps: FlowStep[], stepId: string | null): FlowStep | null {
  if (!stepId) return null;
  return steps.find((step) => step.id === stepId) ?? null;
}

/**
 * Match a user's reply against a step's options.
 *
 * Telegram sends the button's own label back as message text, so an exact match
 * is the common case. Trimmed and case-insensitive because a user can also type
 * the answer by hand instead of tapping — on a phone keyboard that means stray
 * whitespace and inconsistent capitalisation, and being strict there is exactly
 * how a bot goes silent on someone who did nothing wrong (T6).
 */
export function matchOption(step: FlowStep, text: string): FlowOption | null {
  if (!step.options?.length) return null;

  const normalized = text.trim().toLocaleLowerCase("uz-UZ");
  return (
    step.options.find(
      (option) => option.label.trim().toLocaleLowerCase("uz-UZ") === normalized
    ) ?? null
  );
}

/** A step with no options expects the user to type something. */
export function expectsFreeText(step: FlowStep): boolean {
  return !step.options?.length;
}
