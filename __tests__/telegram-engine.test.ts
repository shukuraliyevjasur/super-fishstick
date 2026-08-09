import { describe, it, expect } from "vitest";
import { buildKeyboard, CALLBACK_PREFIX } from "@/lib/telegram/engine";
import type { FlowStep } from "@/lib/telegram/flow-types";

describe("buildKeyboard", () => {
  it("returns undefined when the step has no options", () => {
    const step: FlowStep = { id: "s1", message: "hello" };
    expect(buildKeyboard(step)).toBeUndefined();
  });

  it("returns undefined when options is an empty array", () => {
    const step: FlowStep = { id: "s1", message: "hello", options: [] };
    expect(buildKeyboard(step)).toBeUndefined();
  });

  it("maps each option to a row with index-based callback_data", () => {
    const step: FlowStep = {
      id: "s1",
      message: "Choose",
      options: [
        { label: "Narx", nextStepId: "s2" },
        { label: "Manzil", nextStepId: null },
      ],
    };

    const kb = buildKeyboard(step);

    expect(kb).toEqual({
      inline_keyboard: [
        [{ text: "Narx", callback_data: `${CALLBACK_PREFIX}0` }],
        [{ text: "Manzil", callback_data: `${CALLBACK_PREFIX}1` }],
      ],
    });
  });

  it("uses the index so Uzbek labels stay under the 64-byte cap", () => {
    const longLabel = "Tovar narxini bilmoqchiman — batafsil ma'lumot";
    const step: FlowStep = {
      id: "s1",
      message: "Choose",
      options: [{ label: longLabel, nextStepId: null }],
    };

    const kb = buildKeyboard(step)!;
    const data = kb.inline_keyboard[0][0].callback_data;

    expect(data).toBe(`${CALLBACK_PREFIX}0`);
    expect(Buffer.byteLength(data, "utf-8")).toBeLessThanOrEqual(64);
  });
});
