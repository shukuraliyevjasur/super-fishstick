import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import type { NextRequest } from "next/server";

/**
 * Accept-Language negotiation on first visit. Only runs for an unprefixed path;
 * once the URL carries /uz, /ru or /en the prefix wins.
 */
function localeFor(acceptLanguage: string | null): string {
  const request = {
    nextUrl: { pathname: "/" },
    url: "https://replie.uz/",
    headers: new Headers(
      acceptLanguage ? { "accept-language": acceptLanguage } : {}
    ),
    cookies: { has: () => false },
  } as unknown as NextRequest;

  const response = proxy(request);
  const location = response?.headers.get("location") ?? "";
  return new URL(location).pathname.split("/")[1] ?? "";
}

describe("locale detection", () => {
  it("picks Russian and English from ordinary browser headers", () => {
    expect(localeFor("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(localeFor("en-US,en;q=0.9")).toBe("en");
  });

  it("is case-insensitive", () => {
    // Regression guard: the header used to be matched without being lowercased,
    // because `?? "".toLowerCase()` lowercased the fallback instead.
    expect(localeFor("RU-RU,RU;q=0.9")).toBe("ru");
    expect(localeFor("EN-GB")).toBe("en");
  });

  it("falls back to Uzbek for anything unrecognised or missing", () => {
    expect(localeFor("fr-FR,fr;q=0.9")).toBe("uz");
    expect(localeFor("")).toBe("uz");
    expect(localeFor(null)).toBe("uz");
  });

  it("does not match a language embedded in a longer subtag", () => {
    // \b guards this: "ru" must not be found inside e.g. a region like "bru".
    expect(localeFor("bru-XX")).toBe("uz");
  });
});
