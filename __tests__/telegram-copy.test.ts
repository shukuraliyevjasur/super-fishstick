import { describe, it, expect } from "vitest";
import { BOT_COPY } from "@/lib/telegram/copy";

describe("BOT_COPY regression guard", () => {
  const keys = Object.keys(BOT_COPY) as (keyof typeof BOT_COPY)[];

  it("has all expected keys", () => {
    const expected = [
      "noPayload",
      "unknownCampaign",
      "noFlow",
      "emptyFlow",
      "noMatch",
      "finished",
      "linked",
      "linkFailed",
    ];
    expect(keys).toEqual(expect.arrayContaining(expected));
    expect(keys).toHaveLength(expected.length);
  });

  it.each(keys)("%s is a non-empty string", (key) => {
    expect(typeof BOT_COPY[key]).toBe("string");
    expect(BOT_COPY[key].length).toBeGreaterThan(0);
  });
});
