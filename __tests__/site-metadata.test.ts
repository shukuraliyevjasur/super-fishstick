import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PROTECTED_PATHS,
  PUBLIC_LOCALES,
  getOgLocale,
  getSiteUrl,
  localeAlternates,
} from "../lib/site";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("strips trailing slashes, which would double up when joined", () => {
    vi.stubEnv("APP_URL", "https://replie.uz/");
    expect(getSiteUrl()).toBe("https://replie.uz");
  });

  it("prefers APP_URL over NEXTAUTH_URL", () => {
    vi.stubEnv("APP_URL", "https://www.replie.uz");
    vi.stubEnv("NEXTAUTH_URL", "https://other.example");
    expect(getSiteUrl()).toBe("https://www.replie.uz");
  });
});

describe("localeAlternates (Q3)", () => {
  it("gives each locale its own canonical and every hreflang", () => {
    expect(localeAlternates("/pricing", "ru")).toEqual({
      canonical: "/ru/pricing",
      languages: {
        uz: "/uz/pricing",
        ru: "/ru/pricing",
        en: "/en/pricing",
      },
    });
  });

  it("covers every supported locale, so a new one cannot be half-added", () => {
    // English was added on 2026-08-03 and had to be threaded through the
    // sitemap, hreflang, og:locale and prerendering in one go.
    const { languages } = localeAlternates("", "uz");
    expect(Object.keys(languages)).toEqual([...PUBLIC_LOCALES]);
  });

  it("handles the landing page, whose path is empty", () => {
    expect(localeAlternates("", "uz").canonical).toBe("/uz");
  });
});

describe("getOgLocale", () => {
  it("maps every supported locale to a territory code", () => {
    // og:locale wants a territory, not a bare language tag.
    for (const locale of PUBLIC_LOCALES) {
      expect(getOgLocale(locale)).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });

  it("falls back rather than emitting undefined for an unknown value", () => {
    expect(getOgLocale("xx")).toBe("uz_UZ");
  });
});

describe("robots (Q6)", () => {
  it("disallows every protected path with a locale wildcard", () => {
    // The old `/dashboard/` rule matched nothing, because every real path is
    // locale-prefixed (/uz/dashboard, /ru/dashboard).
    const { disallow } = robots().rules as { disallow: string[] };

    for (const path of PROTECTED_PATHS) {
      expect(disallow).toContain(`/*${path}`);
    }
    expect(disallow).not.toContain("/dashboard/");
  });

  it("keeps the locale-less routes disallowed by their real paths", () => {
    // /api and /r are excluded from the locale matcher, so they are genuinely
    // not locale-prefixed and must not gain a wildcard.
    const { disallow } = robots().rules as { disallow: string[] };
    expect(disallow).toEqual(expect.arrayContaining(["/api/", "/r/", "/reports/"]));
  });
});

describe("sitemap (Q5)", () => {
  it("lists every public path in every locale", () => {
    vi.stubEnv("APP_URL", "https://replie.uz");
    const urls = sitemap().map((entry) => entry.url);

    for (const path of ["", "/pricing", "/privacy", "/terms", "/data-deletion"]) {
      for (const locale of PUBLIC_LOCALES) {
        expect(urls).toContain(`https://replie.uz/${locale}${path}`);
      }
    }
  });

  it("advertises no unprefixed URL, which would cost a redirect hop", () => {
    vi.stubEnv("APP_URL", "https://replie.uz");
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).not.toContain("https://replie.uz");
    expect(urls).not.toContain("https://replie.uz/pricing");
  });

  it("carries hreflang alternates on every entry", () => {
    vi.stubEnv("APP_URL", "https://replie.uz");
    for (const entry of sitemap()) {
      expect(Object.keys(entry.alternates?.languages ?? {})).toEqual([
        ...PUBLIC_LOCALES,
      ]);
    }
  });
});
