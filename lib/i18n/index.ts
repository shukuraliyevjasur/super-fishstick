import "server-only"
import type { Dict, Locale } from "./types"

export type { Dict, Locale }
export { uz } from "./uz"
export { ru } from "./ru"

export const locales: Locale[] = ["uz", "ru"]
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
