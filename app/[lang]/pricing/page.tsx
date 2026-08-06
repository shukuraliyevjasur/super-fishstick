import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getOgLocale, localeAlternates } from "@/lib/site";
import PublicSiteHeader from "@/components/public-site-header";
import PublicSiteFooter from "@/components/public-site-footer";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = await getDictionary(lang);
  return {
    title: d.pricing.metaTitle,
    description: d.pricing.metaDesc,
    alternates: localeAlternates("/pricing", lang),
    openGraph: {
      title: d.pricing.metaTitle,
      description: d.pricing.metaDesc,
      url: `/${lang}/pricing`,
      siteName: "replie",
      locale: getOgLocale(lang),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: d.pricing.metaTitle,
      description: d.pricing.metaDesc,
    },
  };
}

export default async function PricingPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = await getDictionary(lang);
  const p = d.pricing;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader />
      <section className="flex flex-col items-center justify-center px-5 py-32 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{p.questions}</h1>
        <p className="mt-4 max-w-md text-lg text-muted">{p.metaDesc}</p>
        <a
          href="https://t.me/ceo_syr"
          target="_blank"
          rel="noreferrer"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {p.telegramLink}
        </a>
      </section>
      <PublicSiteFooter />
    </main>
  );
}
