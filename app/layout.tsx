import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://replie.uz"),
  title: {
    default: "replie — Instagram izohlarini DM ga aylantirish",
    template: "%s | replie",
  },
  description:
    "Instagram izohlariga avtomatik DM yuboring. Rasmiy Meta API orqali ishlaydigan, kuchli kampaniya boshqaruv tizimi.",
  keywords: [
    "instagram avtomatlashtirish",
    "izoh to DM",
    "instagram xususiy javoblar",
    "ijtimoiy savdo",
    "DM avtomatlashtirish",
  ],
  openGraph: {
    title: "replie — Instagram izohlarini DM ga aylantirish",
    description:
      "Instagram izohlariga avtomatik DM yuboring. Rasmiy Meta API orqali ishlaydigan, kuchli kampaniya boshqaruv tizimi.",
    url: "/",
    siteName: "replie",
    locale: "uz_UZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "replie — Instagram izohlarini DM ga aylantirish",
    description:
      "Instagram izohlariga avtomatik DM yuboring. Rasmiy Meta API orqali ishlaydigan, kuchli kampaniya boshqaruv tizimi.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="h-full">
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
