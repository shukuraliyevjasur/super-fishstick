import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Shared by both root layouts (`app/[lang]` and `app/reports`), so the two
 * trees cannot drift onto different font configurations.
 *
 * `latin-ext` covers the Uzbek Latin diacritics (oʻ, gʻ, ch, sh);
 * `cyrillic-ext` covers Russian. Plain `cyrillic` is not a valid subset for
 * this font — use `cyrillic-ext`.
 */
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext", "cyrillic-ext"],
  variable: "--font-plus-jakarta",
  display: "swap",
});
