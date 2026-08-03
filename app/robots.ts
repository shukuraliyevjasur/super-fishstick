import type { MetadataRoute } from "next";
import { PROTECTED_PATHS, getSiteUrl } from "@/lib/site";

/**
 * Q6. `Disallow: /dashboard/` matched nothing — every real dashboard path is
 * locale-prefixed (`/uz/dashboard`, `/ru/dashboard`), so the rule looked like
 * it was doing a job it never did. Low impact, since the dashboard requires
 * auth, but a rule that silently matches nothing is worse than no rule.
 *
 * `/api/` and `/r/` are correct as-is: those are excluded from the locale
 * middleware matcher and are genuinely not locale-prefixed.
 *
 * `/reports/` is added — public client-report share links are handed to
 * specific third parties and should not be indexed. The reports layout also
 * sets `robots: { index: false }`, which is the enforcing half; this is the
 * hint for crawlers that never fetch the page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...PROTECTED_PATHS.map((path) => `/*${path}`),
        "/api/",
        "/r/",
        "/reports/",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
