import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

/**
 * The locale middleware prefixes any unprefixed path with /uz or /ru. Routes
 * that have no page under app/[lang] must therefore be excluded from the
 * matcher, or the redirect lands on a 404.
 *
 * This regressed once already: the i18n migration sent /r/<slug> to
 * /uz/r/<slug>, which 404s — breaking the tracked links baked into every DM
 * that had already been sent, and losing every click with them.
 */
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher", () => {
  it("skips tracked-link redirects, whose URLs are already inside sent DMs", () => {
    expect(matcher.test("/r/abc123")).toBe(false);
  });

  it("skips public report share links", () => {
    expect(matcher.test("/reports/some-share-slug")).toBe(false);
  });

  it("skips crawler files served from the domain root", () => {
    expect(matcher.test("/robots.txt")).toBe(false);
    expect(matcher.test("/sitemap.xml")).toBe(false);
  });

  it("skips public assets, which must not be locale-prefixed", () => {
    expect(matcher.test("/broadcastttutorial.mp4")).toBe(false);
    expect(matcher.test("/replie-logo.svg")).toBe(false);
  });

  it("skips Telegram Mini App pages, which have no locale prefix", () => {
    expect(matcher.test("/miniapp/some-share-slug")).toBe(false);
  });

  it("skips API routes and Next internals", () => {
    expect(matcher.test("/api/webhook")).toBe(false);
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/_next/image")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
  });

  it("still localises real pages", () => {
    for (const path of ["/", "/dashboard", "/privacy", "/login", "/signup", "/pricing"]) {
      expect(matcher.test(path)).toBe(true);
    }
  });

  it("still localises already-prefixed pages, so the auth guard keeps running", () => {
    // /uz/dashboard must reach the middleware — that is where the signed-out
    // redirect to /uz/login happens.
    expect(matcher.test("/uz/dashboard")).toBe(true);
    expect(matcher.test("/ru/settings")).toBe(true);
  });
});
