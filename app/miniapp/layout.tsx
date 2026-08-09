import type { ReactNode } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { plusJakartaSans } from "@/app/fonts";
import { getSiteUrl } from "@/lib/site";
import "@/app/globals.css";

/**
 * Root layout for Telegram Mini App report pages (T12).
 *
 * Like `app/reports/layout.tsx`, this is a separate root layout for a route
 * tree that cannot carry a `[lang]` prefix. The middleware matcher excludes
 * `/miniapp/` so the locale redirect never fires.
 *
 * Injects the Telegram WebApp SDK script so pages can call
 * `window.Telegram.WebApp` to read theme params and signal readiness.
 */

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  robots: { index: false, follow: false },
};

export default function MiniAppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="uz" className={`h-full ${plusJakartaSans.variable}`}>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
