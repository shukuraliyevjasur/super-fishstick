import { describe, it, expect } from "vitest";
import { validateFlow } from "@/lib/telegram/flow-validation";
import { parseFlowSteps } from "@/lib/telegram/flow-types";

function steps(raw: unknown[]) {
  return parseFlowSteps(raw);
}

/** A complete, valid two-step funnel. */
const GOOD = steps([
  {
    id: "s1",
    message: "Nima qiziqtiradi?",
    options: [
      { label: "Narx", nextStepId: "s2" },
      { label: "Manzil", nextStepId: null },
    ],
  },
  { id: "s2", message: "Raqamingiz?", nextStepId: null },
]);

describe("flow validation (D5)", () => {
  it("passes a complete flow", () => {
    const result = validateFlow(GOOD);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("rejects a flow with no steps", () => {
    const result = validateFlow([]);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("EMPTY_FLOW");
  });

  it("catches a step with no message", () => {
    const result = validateFlow(
      steps([{ id: "s1", message: "   ", nextStepId: null }])
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "EMPTY_MESSAGE", stepId: "s1" })
    );
  });

  it("catches a branch pointing at a step that does not exist", () => {
    const result = validateFlow(
      steps([
        {
          id: "s1",
          message: "Tanlang",
          options: [
            { label: "Bor", nextStepId: "s2" },
            { label: "Yo'q", nextStepId: "deleted-step" },
          ],
        },
        { id: "s2", message: "Rahmat", nextStepId: null },
      ])
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "BROKEN_LINK",
        stepId: "s1",
        // The option index is what lets the editor deep-link to the branch.
        optionIndex: 1,
      })
    );
  });

  it("catches duplicate step ids", () => {
    const result = validateFlow(
      steps([
        { id: "s1", message: "Bir", nextStepId: null },
        { id: "s1", message: "Ikki", nextStepId: null },
      ])
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_STEP_ID" })
    );
  });

  // The failure drill-in is structurally prone to: an orphaned branch never
  // appears on any screen the builder opens.
  it("warns about a step nothing points at, without blocking the save", () => {
    const result = validateFlow(
      steps([
        { id: "s1", message: "Salom", nextStepId: null },
        { id: "orphan", message: "Meni hech kim chaqirmaydi", nextStepId: null },
      ])
    );

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "UNREACHABLE_STEP", stepId: "orphan" })
    );
  });

  // A user trapped in a loop: the bot keeps asking and never concludes.
  it("catches a flow that can never end", () => {
    const result = validateFlow(
      steps([
        { id: "s1", message: "Bir", nextStepId: "s2" },
        { id: "s2", message: "Ikki", nextStepId: "s1" },
      ])
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "NO_TERMINAL_STATE" })
    );
  });

  it("accepts a loop as long as some path out of it ends", () => {
    const result = validateFlow(
      steps([
        {
          id: "s1",
          message: "Yana?",
          options: [
            { label: "Ha", nextStepId: "s1" },
            { label: "Yo'q", nextStepId: null },
          ],
        },
      ])
    );

    expect(result.valid).toBe(true);
  });

  it("reports every problem at once rather than the first", () => {
    const result = validateFlow(
      steps([
        { id: "s1", message: "", nextStepId: "missing" },
        { id: "orphan", message: "", nextStepId: null },
      ])
    );

    const codes = result.errors.map((issue) => issue.code);
    expect(codes).toContain("EMPTY_MESSAGE");
    expect(codes).toContain("BROKEN_LINK");
    expect(result.warnings.map((issue) => issue.code)).toContain("UNREACHABLE_STEP");
  });
});
