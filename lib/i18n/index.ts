import "server-only"
import type { Dict, Locale } from "./types"
import { PUBLIC_LOCALES } from "@/lib/site"

export type { Dict, Locale }
export { uz } from "./uz"
export { ru } from "./ru"

// Defined in lib/site.ts because metadata and robots/sitemap need the same
// list and cannot import this module — it is server-only.
export const locales: Locale[] = [...PUBLIC_LOCALES]
export const defaultLocale: Locale = "uz"

export function hasLocale(s: string): s is Locale {
  return locales.includes(s as Locale)
}

const loaders: Record<Locale, () => Promise<Dict>> = {
  uz: () => import("./uz").then((m) => m.uz),
  ru: () => import("./ru").then((m) => m.ru),
}

export async function getDictionary(locale: Locale): Promise<Dict> {
  return loaders[locale]()
}
