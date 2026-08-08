import { describe, it, expect } from "vitest";
import { chainFrom, pruneCrumbs } from "@/lib/telegram/flow-chain";
import { parseFlowSteps } from "@/lib/telegram/flow-types";

const STEPS = parseFlowSteps([
  { id: "a", message: "Bir", nextStepId: "b" },
  {
    id: "b",
    message: "Tanlang",
    options: [
      { label: "Chap", nextStepId: "c" },
      { label: "O'ng", nextStepId: null },
    ],
  },
  { id: "c", message: "Chap tarmoq", nextStepId: "d" },
  { id: "d", message: "Oxiri", nextStepId: null },
]);

describe("drill-in levels (D1)", () => {
  it("runs from the entry step up to and including the first branch", () => {
    // b branches, so the level stops there — its options are the way onward.
    expect(chainFrom(STEPS, "a").map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("opens a branch as its own level", () => {
    expect(chainFrom(STEPS, "c").map((s) => s.id)).toEqual(["c", "d"]);
  });

  it("returns nothing for a missing or null start", () => {
    expect(chainFrom(STEPS, null)).toEqual([]);
    expect(chainFrom(STEPS, "gone")).toEqual([]);
  });

  it("does not hang on a cycle", () => {
    // Validation reports this as an error; the editor still has to draw it
    // rather than lock up.
    const looping = parseFlowSteps([
      { id: "x", message: "Bir", nextStepId: "y" },
      { id: "y", message: "Ikki", nextStepId: "x" },
    ]);

    expect(chainFrom(looping, "x").map((s) => s.id)).toEqual(["x", "y"]);
  });
});

describe("breadcrumb pruning", () => {
  it("keeps a trail whose steps all still exist", () => {
    const crumbs = [{ stepId: "c", label: "Chap" }];

    expect(pruneCrumbs(STEPS, crumbs)).toEqual(crumbs);
  });

  it("cuts the trail at the first deleted step", () => {
    // Deleting a step you had drilled into would otherwise leave the editor on
    // an empty level with a breadcrumb promising content.
    const crumbs = [
      { stepId: "c", label: "Chap" },
      { stepId: "deleted", label: "Yo'q" },
      { stepId: "d", label: "Keyingi" },
    ];

    expect(pruneCrumbs(STEPS, crumbs)).toEqual([{ stepId: "c", label: "Chap" }]);
  });
});
