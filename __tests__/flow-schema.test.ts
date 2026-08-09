import { describe, it, expect } from "vitest";
import { flowStepSchema, flowStepsSchema, flowOptionSchema } from "@/lib/telegram/flow-schema";

describe("flowOptionSchema", () => {
  it("accepts a valid option", () => {
    expect(flowOptionSchema.parse({ label: "Narx", nextStepId: "s2" })).toBeTruthy();
  });

  it("accepts null nextStepId (terminal)", () => {
    const result = flowOptionSchema.parse({ label: "Tugadi", nextStepId: null });
    expect(result.nextStepId).toBeNull();
  });

  it("rejects an empty label", () => {
    expect(() => flowOptionSchema.parse({ label: "", nextStepId: null })).toThrow();
  });

  it("rejects a label over 64 characters", () => {
    expect(() =>
      flowOptionSchema.parse({ label: "a".repeat(65), nextStepId: null })
    ).toThrow();
  });
});

describe("flowStepSchema", () => {
  it("accepts a minimal step", () => {
    const result = flowStepSchema.parse({ id: "s1", message: "Salom" });
    expect(result.id).toBe("s1");
    expect(result.message).toBe("Salom");
  });

  it("accepts a step with options, saveAnswerAs, and nextStepId", () => {
    const result = flowStepSchema.parse({
      id: "s1",
      message: "Choose",
      options: [{ label: "A", nextStepId: "s2" }],
      saveAnswerAs: "choice",
      nextStepId: null,
    });
    expect(result.options).toHaveLength(1);
    expect(result.saveAnswerAs).toBe("choice");
  });

  it("rejects an empty id", () => {
    expect(() => flowStepSchema.parse({ id: "", message: "hi" })).toThrow();
  });

  it("rejects a message over 4000 characters", () => {
    expect(() =>
      flowStepSchema.parse({ id: "s1", message: "x".repeat(4001) })
    ).toThrow();
  });

  it("accepts a message at exactly 4000 characters", () => {
    const result = flowStepSchema.parse({ id: "s1", message: "x".repeat(4000) });
    expect(result.message).toHaveLength(4000);
  });

  it("rejects more than 8 options", () => {
    const options = Array.from({ length: 9 }, (_, i) => ({
      label: `Opt ${i}`,
      nextStepId: null,
    }));
    expect(() =>
      flowStepSchema.parse({ id: "s1", message: "hi", options })
    ).toThrow();
  });

  it("accepts exactly 8 options", () => {
    const options = Array.from({ length: 8 }, (_, i) => ({
      label: `Opt ${i}`,
      nextStepId: null,
    }));
    const result = flowStepSchema.parse({ id: "s1", message: "hi", options });
    expect(result.options).toHaveLength(8);
  });
});

describe("flowStepsSchema", () => {
  it("accepts an empty array", () => {
    expect(flowStepsSchema.parse([])).toEqual([]);
  });

  it("rejects more than 100 steps", () => {
    const steps = Array.from({ length: 101 }, (_, i) => ({
      id: `s${i}`,
      message: `Step ${i}`,
    }));
    expect(() => flowStepsSchema.parse(steps)).toThrow();
  });

  it("accepts exactly 100 steps", () => {
    const steps = Array.from({ length: 100 }, (_, i) => ({
      id: `s${i}`,
      message: `Step ${i}`,
    }));
    expect(flowStepsSchema.parse(steps)).toHaveLength(100);
  });
});
