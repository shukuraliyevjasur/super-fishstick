import type { Locale } from "./types";

/**
 * BCP-47 tags for `Intl` / `toLocaleString`.
 *
 * Deliberately in its own module with no `server-only` import, so client
 * components can use it — `lib/i18n/index.ts` cannot be imported from the
 * client. Dashboard pages were formatting every date as `uz-UZ` regardless of
 * the active locale, which showed Uzbek month names to Russian and English
 * users on otherwise translated pages.
 */
const INTL_TAGS: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

export function intlLocale(locale: Locale): string {
  return INTL_TAGS[locale] ?? INTL_TAGS.uz;
}
