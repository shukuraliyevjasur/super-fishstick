import { describe, it, expect } from "vitest";
import {
  expectsFreeText,
  findStep,
  getEntryStep,
  matchOption,
  parseFlowSteps,
} from "@/lib/telegram/flow-types";

describe("flow step parsing", () => {
  it("keeps the good steps and drops the malformed ones", () => {
    const steps = parseFlowSteps([
      { id: "s1", message: "Salom" },
      { message: "no id" },
      { id: "s2" },
      null,
      "nope",
      { id: "s3", message: "Rahmat", nextStepId: null },
    ]);

    expect(steps.map((step) => step.id)).toEqual(["s1", "s3"]);
  });

  it("returns nothing for a non-array column value", () => {
    expect(parseFlowSteps(null)).toEqual([]);
    expect(parseFlowSteps({})).toEqual([]);
    expect(parseFlowSteps("[]")).toEqual([]);
  });

  it("drops options with no label and defaults a missing target to an ending", () => {
    const [step] = parseFlowSteps([
      {
        id: "s1",
        message: "Tanlang",
        options: [{ label: "Narx" }, { nextStepId: "s2" }, { label: "" }],
      },
    ]);

    expect(step.options).toEqual([{ label: "Narx", nextStepId: null }]);
  });

  it("treats an empty options array as a free-text step", () => {
    const [step] = parseFlowSteps([{ id: "s1", message: "Yozing", options: [] }]);

    expect(step.options).toBeUndefined();
    expect(expectsFreeText(step)).toBe(true);
  });
});

describe("flow navigation", () => {
  const steps = parseFlowSteps([
    {
      id: "s1",
      message: "Tanlang",
      options: [{ label: "Narx", nextStepId: "s2" }],
    },
    { id: "s2", message: "Raqam" },
  ]);

  it("treats the first step as the entry point", () => {
    expect(getEntryStep(steps)?.id).toBe("s1");
    expect(getEntryStep([])).toBeNull();
  });

  it("finds steps by id and handles a null target as an ending", () => {
    expect(findStep(steps, "s2")?.message).toBe("Raqam");
    expect(findStep(steps, null)).toBeNull();
    expect(findStep(steps, "missing")).toBeNull();
  });

  it("matches an option label ignoring case and surrounding space", () => {
    expect(matchOption(steps[0], "  NARX ")?.nextStepId).toBe("s2");
    expect(matchOption(steps[0], "narx")?.nextStepId).toBe("s2");
    expect(matchOption(steps[0], "boshqa")).toBeNull();
    // A free-text step has nothing to match against.
    expect(matchOption(steps[1], "narx")).toBeNull();
  });
});
