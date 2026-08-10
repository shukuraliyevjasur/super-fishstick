/**
 * The canonical origin of the public site.
 *
 * Single source for `metadataBase`, `app/sitemap.ts` and `app/robots.ts` so the
 * host advertised to crawlers cannot drift from the one used to build canonical
 * URLs (Q4).
 *
 * **This must match the host the deployment actually serves.** `replie.uz` is
 * the primary domain; `www.replie.uz` redirects to it. Keep `APP_URL` on the
 * apex so links we generate never make visitors pay for that redirect.
 *
 * `APP_URL` also builds tracked links inside sent DMs
 * (`lib/tracking/message.ts`), so changing it changes newly generated links.
 * Existing links keep working through the redirect, but know that this value
 * is load bearing in two places at once.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://replie.uz";
  // Trailing slashes would produce `https://replie.uz//uz` when joined.
  return raw.replace(/\/+$/, "");
}

/**
 * The supported locales, and the single source of truth for them.
 *
 * This lives here rather than in `lib/i18n` because that module is
 * `server-only` and so cannot be imported by `app/robots.ts`, `app/sitemap.ts`
 * or page metadata. `lib/i18n` re-exports this as `locales`, so the two cannot
 * drift.
 */
export const PUBLIC_LOCALES = ["uz", "ru", "en"] as const;

/**
 * Paths that require a session, relative to the locale prefix.
 *
 * Shared by `proxy.ts` (which redirects signed-out visitors to login) and
 * `app/robots.ts` (which tells crawlers not to bother). Keeping one list means
 * adding a protected page cannot leave it advertised to crawlers — the previous
 * `Disallow: /dashboard/` matched nothing at all, because every real path is
 * locale-prefixed (Q6).
 */
export const PROTECTED_PATHS = [
  "/dashboard",
  "/campaigns",
  "/automations",
  "/logs",
  "/settings",
  "/inbox",
  "/overview",
  "/diagnostics",
  "/set-password",
] as const;

/**
 * OpenGraph `locale` codes. `og:locale` wants a territory, not a bare language.
 *
 * Kept beside PUBLIC_LOCALES and typed against it, so adding a locale without a
 * code here is a type error rather than a silently wrong tag.
 */
const OG_LOCALES: Record<(typeof PUBLIC_LOCALES)[number], string> = {
  uz: "uz_UZ",
  ru: "ru_RU",
  en: "en_US",
};

export function getOgLocale(lang: string): string {
  return OG_LOCALES[lang as (typeof PUBLIC_LOCALES)[number]] ?? "uz_UZ";
}

/**
 * `canonical` + `hreflang` for a locale-prefixed public page (Q3).
 *
 * `path` is everything after the locale segment: `""` for the landing page,
 * `"/pricing"` for pricing. Relative values are resolved against
 * `metadataBase`, so the canonical host follows `getSiteUrl()` automatically.
 */
export function localeAlternates(path: string, lang: string) {
  return {
    canonical: `/${lang}${path}`,
    languages: Object.fromEntries(
      PUBLIC_LOCALES.map((locale) => [locale, `/${locale}${path}`])
    ),
  };
}
