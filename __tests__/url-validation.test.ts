import { describe, expect, it } from "vitest";
import {
  httpUrlOrEmptySchema,
  httpUrlSchema,
  isHttpUrl,
} from "../lib/validation/url";

/**
 * S3 / S5. The exact values the security audit proved `z.string().url()`
 * accepted, plus the ordinary https attacker host that is the actual risk.
 */
const REJECTED = [
  "javascript:alert(1)",
  "data:text/html,<h1>x",
  "file:///etc/passwd",
  "ftp://example.com/x",
  "not a url",
  "",
];

const ACCEPTED = [
  "https://example.com/offer",
  "http://example.com/offer",
  "https://example.com/path?utm=1#frag",
  // Not blocked on purpose: nothing server-side fetches these, so there is no
  // SSRF to prevent. Documented in lib/validation/url.ts.
  "http://169.254.169.254/latest/meta-data/",
  // An ordinary attacker host stays valid — scheme validation is not the
  // defence against phishing content, and must not be mistaken for one.
  "https://evil.example/phish",
];

describe("isHttpUrl", () => {
  it.each(REJECTED)("rejects %j", (value) => {
    expect(isHttpUrl(value)).toBe(false);
  });

  it.each(ACCEPTED)("accepts %j", (value) => {
    expect(isHttpUrl(value)).toBe(true);
  });
});

describe("httpUrlSchema", () => {
  it.each(REJECTED)("rejects %j", (value) => {
    expect(httpUrlSchema.safeParse(value).success).toBe(false);
  });

  it.each(ACCEPTED)("accepts %j", (value) => {
    expect(httpUrlSchema.safeParse(value).success).toBe(true);
  });
});

describe("httpUrlOrEmptySchema", () => {
  it("accepts empty string, which clears a tracked link", () => {
    expect(httpUrlOrEmptySchema.safeParse("").success).toBe(true);
  });

  it("still rejects a non-http scheme", () => {
    expect(httpUrlOrEmptySchema.safeParse("javascript:alert(1)").success).toBe(
      false
    );
  });

  it("accepts a normal https destination", () => {
    expect(httpUrlOrEmptySchema.safeParse("https://example.com").success).toBe(
      true
    );
  });
});
