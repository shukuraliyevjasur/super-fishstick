import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { DictionaryProvider } from "@/components/dictionary-provider";
import { plusJakartaSans } from "@/app/fonts";
import { PUBLIC_LOCALES, getSiteUrl } from "@/lib/site";
import "@/app/globals.css";

/**
 * Root layout for the localised site.
 *
 * This is a **root layout** — it renders `<html>` and `<body>` — and it lives
 * under `[lang]` on purpose. The previous `app/layout.tsx` could not read the
 * `lang` param from a child segment, so `<html>` shipped with no `lang`
 * attribute at all: a WCAG 3.1.1 (Level A) failure on a bilingual product, and
 * a lost SEO signal (Q1).
 *
 * Reading the locale from a request header in a shared root layout would have
 * worked too, but `headers()` is a request-time API and would have opted every
 * page — including the landing and pricing pages — into dynamic rendering. The
 * Next docs call out this exact case: "The root layout can be under a dynamic
 * segment, for example when implementing internationalization with
 * `app/[lang]/layout.js`."
 *
 * `app/reports/layout.tsx` is the second root layout, for the share links that
 * cannot carry a locale prefix. Navigating between the two trees is a full page
 * load, which is fine — they are different audiences and nothing links across.
 */

type Props = { children: ReactNode; params: Promise<{ lang: string }> };

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  verification: {
    other: {
      "facebook-domain-verification": "0vhaeitxugf2wyq1tv31j4l0dv2csc",
    },
  },
};

export async function generateStaticParams() {
  // Derived, not hand-listed: a locale added to PUBLIC_LOCALES must not silently
  // lose prerendering. English was added on 2026-08-03 and this is why.
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} className={`h-full ${plusJakartaSans.variable}`}>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        <DictionaryProvider dict={dict}>
          {children}
          <Analytics />
        </DictionaryProvider>
      </body>
    </html>
  );
}
