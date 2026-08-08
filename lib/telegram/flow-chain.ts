/**
 * Drill-in levels (D1).
 *
 * The editor shows a flow as a list of step cards, top to bottom. A "level" is
 * the linear run of steps from some entry point up to and including the first
 * step that branches — because a branch is where one list stops being one list.
 * Tapping a branch opens the level that starts at that option's target.
 *
 * Pure functions over the step array, so the traversal the editor draws is the
 * same one validation and the runtime engine walk. Three different traversals
 * of the same tree is how an editor starts disagreeing with the bot.
 */

import { findStep, type FlowStep } from "@/lib/telegram/flow-types";

/**
 * The steps shown at one level, starting from `startId`.
 *
 * Stops at the first branching step (inclusive), at a path that ends, at a
 * dangling target, or on revisiting a step — a cycle must not hang the editor,
 * even though validation reports it separately as an error.
 */
export function chainFrom(steps: FlowStep[], startId: string | null): FlowStep[] {
  const chain: FlowStep[] = [];
  const seen = new Set<string>();

  let current = findStep(steps, startId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);

    // A branching step ends the level: its options are the way onward.
    if (current.options?.length) break;

    current = findStep(steps, current.nextStepId ?? null);
  }

  return chain;
}

export interface Crumb {
  /** Step the level starts at. */
  stepId: string;
  /** The option label that led here. Null for the root level. */
  label: string | null;
}

/**
 * Trim a breadcrumb trail to the steps that still exist.
 *
 * Deleting a step you had drilled into would otherwise leave the editor
 * pointing at nothing — showing an empty list with a breadcrumb that promises
 * content. Cutting the trail at the first missing step lands the user on the
 * deepest level that is still real.
 */
export function pruneCrumbs(steps: FlowStep[], crumbs: Crumb[]): Crumb[] {
  const kept: Crumb[] = [];
  for (const crumb of crumbs) {
    if (!findStep(steps, crumb.stepId)) break;
    kept.push(crumb);
  }
  return kept;
}
