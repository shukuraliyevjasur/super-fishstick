import type { ReactNode } from "react";
import type { Metadata } from "next";
import { plusJakartaSans } from "@/app/fonts";
import { getSiteUrl } from "@/lib/site";
import "@/app/globals.css";

/**
 * Second root layout, for public client-report share links.
 *
 * `/reports/*` is handed to third parties and is excluded from the locale
 * middleware matcher, so it can never carry a `[lang]` prefix and cannot use
 * the layout under `app/[lang]`. The report itself is Uzbek — it formats dates
 * with `uz-UZ` — so the `lang` attribute is fixed rather than negotiated.
 */

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  // Share links are handed to a specific client; they are not for crawlers.
  robots: { index: false, follow: false },
};

export default function ReportsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="uz" className={`h-full ${plusJakartaSans.variable}`}>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
