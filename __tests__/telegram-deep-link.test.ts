import { describe, it, expect } from "vitest";
import {
  buildTelegramDeepLink,
  isValidStartPayload,
  START_PAYLOAD_MAX,
} from "@/lib/telegram/deep-link";

describe("Telegram deep links (T10)", () => {
  it("builds t.me/<bot>?start=<campaignId>", () => {
    expect(buildTelegramDeepLink("clx123abc", "replie_bot")).toBe(
      "https://t.me/replie_bot?start=clx123abc"
    );
  });

  it("tolerates a username written with the @", () => {
    expect(buildTelegramDeepLink("clx123abc", "@replie_bot")).toBe(
      "https://t.me/replie_bot?start=clx123abc"
    );
  });

  // Rendering "t.me/undefined" would be worse than rendering nothing: it looks
  // like a working link and silently loses the customer.
  it("returns null when no bot username is configured", () => {
    expect(buildTelegramDeepLink("clx123abc", undefined)).toBeNull();
    expect(buildTelegramDeepLink("clx123abc", "")).toBeNull();
  });

  it("refuses a payload Telegram would reject", () => {
    expect(isValidStartPayload("clx123abc")).toBe(true);
    expect(isValidStartPayload("with-dash_and_underscore")).toBe(true);
    expect(isValidStartPayload("")).toBe(false);
    expect(isValidStartPayload("has space")).toBe(false);
    expect(isValidStartPayload("has.dot")).toBe(false);
    expect(isValidStartPayload("a".repeat(START_PAYLOAD_MAX + 1))).toBe(false);

    expect(buildTelegramDeepLink("has space", "replie_bot")).toBeNull();
  });

  it("accepts a cuid, which is what campaign ids actually are", () => {
    // The reason no encoding step exists. If ids ever stop being cuids, this
    // is the test that should fail first.
    expect(isValidStartPayload("cmdx9k2p10000v8h4g7q2n1zt")).toBe(true);
  });
});
