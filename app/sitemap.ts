import type { MetadataRoute } from "next";
import { PUBLIC_LOCALES, getSiteUrl } from "@/lib/site";

/**
 * Q5. The sitemap listed only `/` and `/pricing` — the two locale-less redirect
 * stubs — so the Russian half of the site was advertised to crawlers nowhere,
 * and the URLs that were listed each cost a redirect hop to reach a real page.
 *
 * Every entry is now a locale-prefixed URL that resolves directly, and carries
 * `alternates.languages` so `/uz/...` and `/ru/...` are understood as variants
 * of one page rather than duplicates (the sitemap half of Q3).
 *
 * Note the host still depends on `APP_URL` matching what the deployment serves
 * — see the Q4 note in `lib/site.ts`.
 */

/** Public paths worth indexing, relative to the locale prefix. */
const PUBLIC_PATHS = [
  { path: "", priority: 1, changeFrequency: "monthly" as const },
{ path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/data-deletion", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap(({ path, priority, changeFrequency }) =>
    PUBLIC_LOCALES.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          PUBLIC_LOCALES.map((alt) => [alt, `${base}/${alt}${path}`])
        ),
      },
    }))
  );
}
