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
  price: string;
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
    description: "Kontentmaker va kichik biznes uchun",
    price: "47 000",
    period: "so'm/oy",
    badge: "Mashhur",
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
    description: "Agentliklar va katta brendlar uchun",
    price: "87 000",
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
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
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
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
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
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            Oddiy narx — kuchli natija
          </h1>
          <p className="mt-4 text-lg text-muted">
            Bepul boshlang. Istalgan vaqt bekor qilish mumkin.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-lg p-8 ${
                plan.highlighted
                  ? "border-2 border-accent"
                  : "border border-border bg-surface"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  {plan.badge}
                </span>
              )}

              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-base text-muted">{plan.period}</span>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-muted opacity-50"
                  >
                    <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                target={plan.ctaHref.startsWith("http") ? "_blank" : undefined}
                rel={
                  plan.ctaHref.startsWith("http") ? "noreferrer" : undefined
                }
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
