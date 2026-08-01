import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";
import PublicSiteFooter from "@/components/public-site-footer";

export const metadata: Metadata = {
  title: "Narxlar",
  description: "replie narxlari va imkoniyatlari haqida ma'lumot.",
};

interface Feature {
  standard: string | null;
  pro: string;
}

const FEATURES: Feature[] = [
  { standard: "1 ta Instagram akkaunt", pro: "3 ta Instagram akkaunt" },
  { standard: "5 ta faol kampaniya", pro: "Cheksiz kampaniya" },
  { standard: "Kalit so'z trigger", pro: "Kalit so'z trigger" },
  { standard: "Avtomatik DM yuborish", pro: "Avtomatik DM yuborish" },
  { standard: "Ommaviy izoh javobi", pro: "Ommaviy izoh javobi" },
  { standard: "Kampaniya analitikasi", pro: "Kampaniya analitikasi" },
  { standard: "Kampaniya tarixi (logs)", pro: "Kampaniya tarixi (logs)" },
  { standard: null, pro: "Kirish DM + interaktiv tugma" },
  { standard: null, pro: "Follow gate (obuna tekshiruvi)" },
  { standard: null, pro: "Kuzatilgan havolalar va CTR" },
  { standard: null, pro: "Ulashiladigan mijoz hisobotlari" },
  { standard: null, pro: "CSV orqali import" },
  { standard: null, pro: "Ko'p foydalanuvchi" },
  { standard: null, pro: "Prioritet qo'llab-quvvatlash" },
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
          {/* Standard plan */}
          <div className="flex flex-col rounded-lg border border-border bg-surface p-8">
            <h2 className="text-xl font-bold text-foreground">Standart</h2>
            <p className="mt-1 text-sm text-muted">
              Yakka tadbirkor va kichik biznes uchun
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">19 000</span>
              <span className="text-base text-muted">so&apos;m/oy</span>
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {FEATURES.map((f) =>
                f.standard !== null ? (
                  <li
                    key={f.pro}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f.standard}
                  </li>
                ) : (
                  <li
                    key={f.pro}
                    className="flex items-start gap-2.5 text-sm text-muted opacity-50"
                  >
                    <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                    {f.pro}
                  </li>
                )
              )}
            </ul>

            <a
              href={`https://t.me/ceo_syr?text=${encodeURIComponent("Standart rejani olmoqchiman")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-hover px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-border-hover"
            >
              Standart rejani boshlash
            </a>
          </div>

          {/* Pro plan */}
          <div className="flex flex-col rounded-lg border border-accent bg-accent/5 p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Pro</h2>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                Tavsiya etiladi
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Kengayib borayotgan biznes va agentliklar uchun
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">29 000</span>
              <span className="text-base text-muted">so&apos;m/oy</span>
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {FEATURES.map((f) => (
                <li
                  key={f.pro}
                  className="flex items-start gap-2.5 text-sm text-foreground"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f.pro}
                </li>
              ))}
            </ul>

            <a
              href={`https://t.me/ceo_syr?text=${encodeURIComponent("Pro rejani olmoqchiman")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Pro rejani boshlash
            </a>
          </div>
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
