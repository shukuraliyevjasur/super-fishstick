import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";
import PublicSiteFooter from "@/components/public-site-footer";

export const metadata: Metadata = {
  title: "Narxlar",
  description: "replie narxlari va imkoniyatlari haqida ma'lumot.",
};

interface Plan {
  name: string;
  description: string;
  originalPrice?: string;
  price: string;
  savings?: string;
  discountPct?: string;
  period: string;
  features: string[];
  excluded: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    name: "Bepul",
    description: "Sinab ko'rish uchun",
    price: "0",
    period: "so'm/oy",
    features: [
      "1 ta Instagram akkaunt",
      "2 ta kampaniya",
      "100 ta DM/oy",
      "Kalit so'z trigger",
      "Avtomatik DM yuborish",
      "Ommaviy izoh javobi",
      "Kampaniya analitikasi",
    ],
    excluded: [
      "Kirish DM + interaktiv tugma",
      "Follow gate (obuna tekshiruvi)",
      "Kuzatilgan havolalar va CTR",
      "Mijoz hisobotlari",
      "CSV import",
      "Ko'p foydalanuvchi",
    ],
    cta: "Bepul boshlash",
    ctaHref: "/login",
    highlighted: false,
  },
  {
    name: "Standart",
    description: "Pul chop etadigan bizneslar uchun",
    originalPrice: "79 000",
    price: "47 000",
    savings: "32 000 so'm tejaysiz",
    discountPct: "40%",
    period: "so'm/oy",
    badge: "Mashhur tanlov",
    features: [
      "1 ta Instagram akkaunt",
      "Cheksiz kampaniya",
      "3 000 ta DM/oy",
      "Kalit so'z trigger",
      "Avtomatik DM yuborish",
      "Ommaviy izoh javobi",
      "Kampaniya analitikasi",
      "Kirish DM + interaktiv tugma",
      "Follow gate (obuna tekshiruvi)",
      "Kuzatilgan havolalar va CTR",
    ],
    excluded: [
      "Mijoz hisobotlari",
      "CSV import",
      "Ko'p foydalanuvchi",
    ],
    cta: "Standart rejani boshlash",
    ctaHref: `https://t.me/ceo_syr?text=${encodeURIComponent("Standart rejani olmoqchiman")}`,
    highlighted: true,
  },
  {
    name: "Pro",
    description: "Seryozniy okalar uchun",
    originalPrice: "149 000",
    price: "87 000",
    savings: "62 000 so'm tejaysiz",
    discountPct: "41%",
    period: "so'm/oy",
    features: [
      "5 ta Instagram akkaunt",
      "Cheksiz kampaniya",
      "Cheksiz DM",
      "Kalit so'z trigger",
      "Avtomatik DM yuborish",
      "Ommaviy izoh javobi",
      "Kampaniya analitikasi",
      "Kirish DM + interaktiv tugma",
      "Follow gate (obuna tekshiruvi)",
      "Kuzatilgan havolalar va CTR",
      "Mijoz hisobotlari",
      "CSV import",
      "Ko'p foydalanuvchi",
      "Prioritet qo'llab-quvvatlash",
    ],
    excluded: [],
    cta: "Pro rejani boshlash",
    ctaHref: `https://t.me/ceo_syr?text=${encodeURIComponent("Pro rejani olmoqchiman")}`,
    highlighted: false,
  },
];

function CheckIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            Vaqtinchalik chegirma — hozircha shu narxda
          </div>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            Avtomatik DM uchun oyligingizni yarmini berish shart emas.
          </h1>
          <p className="mt-4 text-lg text-muted">
            replie bepuldan boshlanadi — yoqsa, oyiga 4 somsani puli.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl p-8 ${
                plan.highlighted
                  ? "border-2 border-accent shadow-lg shadow-accent/10"
                  : "border border-border bg-surface"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold text-white tracking-wide uppercase">
                  {plan.badge}
                </span>
              )}

              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>

              {/* Price block */}
              <div className="mt-5">
                {plan.originalPrice ? (
                  <>
                    {/* Original price struck through */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg line-through text-muted opacity-60">
                        {plan.originalPrice}
                      </span>
                      <span className="text-xs text-muted opacity-60">so&apos;m/oy</span>
                      {/* Discount % pill */}
                      <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-400 border border-red-500/20">
                        −{plan.discountPct}
                      </span>
                    </div>
                    {/* Sale price */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-green-400">
                        {plan.price}
                      </span>
                      <span className="text-base text-muted">so&apos;m/oy</span>
                    </div>
                    {/* Savings callout */}
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-green-500/10 border border-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-400">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.25 4.75a.75.75 0 0 1 0 1.06L7.56 10.5a.75.75 0 0 1-1.06 0L4.75 8.75a.75.75 0 0 1 1.06-1.06l1.22 1.22 3.13-3.13a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                      {plan.savings}
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-base text-muted">{plan.period}</span>
                  </div>
                )}
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted opacity-40">
                    <XIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                target={plan.ctaHref.startsWith("http") ? "_blank" : undefined}
                rel={plan.ctaHref.startsWith("http") ? "noreferrer" : undefined}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "border border-border bg-surface-hover text-foreground hover:border-border-hover"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted">
          Savollar bormi?{" "}
          <a
            href="https://t.me/ceo_syr"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent hover:underline"
          >
            Telegram orqali yozing
          </a>
          .
        </p>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
