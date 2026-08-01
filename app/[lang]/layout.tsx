import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { DictionaryProvider } from "@/components/dictionary-provider";

export async function generateStaticParams() {
  return [{ lang: "uz" }, { lang: "ru" }];
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
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
