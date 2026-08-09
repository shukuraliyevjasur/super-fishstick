import type { ReactNode } from "react";
import type { Metadata } from "next";
import { plusJakartaSans } from "@/app/fonts";
import { getSiteUrl } from "@/lib/site";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "replie",
  robots: { index: false, follow: false },
};

export default function ControlLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`h-full ${plusJakartaSans.variable}`}>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
