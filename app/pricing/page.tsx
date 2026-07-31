import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";
import PublicSiteFooter from "@/components/public-site-footer";

export const metadata: Metadata = {
  title: "Narxlar",
  description: "replie narxlari va imkoniyatlari haqida ma'lumot.",
};

const PLANS = [
  {
    name: "Standart",
    price: "19 000",
    description: "Yakka tadbirkor va kichik biznes uchun",
    badge: null,
    features: [
      "1 ta Instagram akkaunt",
      "5 ta faol kampaniya",
      "Kalit so'z trigger",
      "Avtomatik DM yuborish",
      "Ommaviy izoh javobi",
      "Kampaniya analitikasi",
      "Kampaniya tarixi (logs)",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29 000",
    description: "Kengayib borayotgan biznes va agentliklar uchun",
    badge: "Tavsiya etiladi",
    features: [
      "3 ta Instagram akkaunt",
      "Cheksiz kampaniya",
      "Kirish DM + interaktiv tugma",
      "Follow gate (obuna tekshiruvi)",
      "Kuzatilgan havolalar va CTR",
      "Ulashiladigan mijoz hisobotlari",
      "CSV orqali import",
      "Ko'p foydalanuvchi",
      "Prioritet qo'llab-quvvatlash",
      "Standartdagi barcha imkoniyatlar",
    ],
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            Oddiy narx — kuchli natija
          </h1>
          <p className="mt-4 text-lg text-muted">
            Har oy. Istalgan vaqt bekor qilish mumkin.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-lg border p-8 ${
                plan.highlighted
                  ? "border-accent bg-accent/5"
                  : "border-border bg-surface"
              }`}
            >
              {plan.badge && (
                <span className="mb-4 inline-block w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  {plan.badge}
                </span>
              )}
              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-base text-muted">so&apos;m/oy</span>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
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
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="https://t.me/ceo_syr"
                target="_blank"
                rel="noreferrer"
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "border border-border bg-surface-hover text-foreground hover:border-border-hover"
                }`}
              >
                Telegram orqali bog&apos;lanish
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
