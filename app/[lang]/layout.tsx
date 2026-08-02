import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { DictionaryProvider } from "@/components/dictionary-provider";

type Props = { children: ReactNode; params: Promise<{ lang: string }> };

export async function generateStaticParams() {
  return [{ lang: "uz" }, { lang: "ru" }];
}

export default async function LangLayout({
  children,
  params,
}: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <DictionaryProvider dict={dict}>
      {children}
      <Analytics />
    </DictionaryProvider>
  );
}
