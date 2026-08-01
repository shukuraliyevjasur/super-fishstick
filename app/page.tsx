import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";
import PublicSiteFooter from "@/components/public-site-footer";

export const metadata: Metadata = {
  title: "replie - Instagram izohlarini DM ga aylantiring",
  description:
    "Instagram post yoki reelga kalit so'z izoh yozilganda, foydalanuvchiga avtomatik DM yuboriladi. Rasmiy Meta API orqali.",
};

const flowSteps = [
  {
    number: "01",
    eyebrow: "Ulang",
    title: "Instagram akkauntingizni ulang",
    description:
      "Email orqali kiring va Instagram professional akkauntingizni bir marta ulang. Parol almashish yoki brauzer avtomatizatsiyasi yo'q.",
  },
  {
    number: "02",
    eyebrow: "Yarating",
    title: "Post, kalit so'z va DM matnini belgilang",
    description:
      "Reel yoki post uchun kampaniya yarating: kuzatiladigan kalit so'z, ommaviy javob va yuboriladigan DM matni.",
  },
  {
    number: "03",
    eyebrow: "Ishga tushiring",
    title: "Javoblar API orqali avtomatik yuboriladi",
    description:
      "Webhook izohlarni darhol ushlaydi, polling esa o'tkazib yuborilganlarini to'ldiradi. Har bir yuboruv navbatga olinadi, cheklangan va jurnallanadi.",
  },
];

const heroFeatures = [
  {
    title: "Follow gate",
    description:
      "Obuna bo’lmagan foydalanuvchi havolaga yetolmaydi. Bot tekshiradi — faqat obuna bo’lganda yuboradi.",
  },
  {
    title: "Kuzatuvchi havolalar",
    description:
      "Har bir yuborilgan havolaga klik soni va CTR ko’rsatiladi — qaysi kampaniya ishlayotganini bilasiz.",
  },
  {
    title: "DM jurnali",
    description:
      "Har bir yuboruv sababi bilan jurnallanadi: yuborildi, navbatda, muvaffaqiyatsiz.",
  },
];

const supportingFeatures = [
  "Email magic-link orqali kirish",
  "Bir nechta Instagram akkaunt",
  "Tokenlar xavfsiz saqlanadi",
  "Webhook + polling monitoring",
  "Kalit so’zlar bo’yicha avto-DM",
  "Jamoaviy workspace",
];

function AppWindow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
      <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-2 text-xs text-muted">{label}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

const dashboardStats = [
  ["Faol kampaniya", "8"],
  ["DM Yuborilgan", "1,284"],
  ["O'tkazib yuborilgan", "42"],
  ["Muvaffaqiyatsiz", "3"],
  ["Kliklar", "356"],
  ["CTR", "27.7%"],
];

const dashboardChart: [string, number][] = [
  ["Du", 42],
  ["Se", 68],
  ["Ch", 51],
  ["Pa", 94],
  ["Ju", 120],
  ["Sh", 86],
  ["Ya", 73],
];

const dashboardActivity = [
  ["@maya.co", "Mahsulot yo'riqnomasi", "Yuborildi", "text-success"],
  ["@founder.ray", "Narx so'rovi", "Yuborildi", "text-success"],
  ["@shop.ava", "Lead magnet", "Navbatda", "text-warning"],
];

function DashboardPreview() {
  const maxDM = Math.max(...dashboardChart.map(([, n]) => n));
  return (
    <AppWindow label="app / bosh sahifa">
      <h3 className="text-sm font-semibold text-foreground">Salom, Maya!</h3>
      <p className="mt-0.5 text-xs text-muted">2 ta ulangan akkaunt · 340 ta kontakt</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {dashboardStats.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold text-foreground">DM — Oxirgi 7 kun</p>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {dashboardChart.map(([day, n]) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-muted">{n}</span>
              <div
                className="w-full rounded-t-md bg-accent"
                style={{ height: `${Math.max((n / maxDM) * 100, 4)}%` }}
              />
              <span className="text-xs text-muted">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold text-foreground">So&apos;nggi faoliyat</p>
        <div className="mt-2 space-y-2">
          {dashboardActivity.map(([user, automation, status, color]) => (
            <div
              key={user}
              className="flex items-center justify-between gap-3 border-b border-border py-1.5 text-xs last:border-0"
            >
              <span className="truncate text-foreground font-medium">{user}</span>
              <span className="truncate text-muted">{automation}</span>
              <span className={color}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}

function MatchedCommentCard() {
  return (
    <div className="w-56 rounded-lg border border-border bg-surface p-4 shadow-lg">
      <p className="text-xs text-muted">Yangi izoh</p>
      <p className="mt-1 text-sm font-semibold text-foreground">@maya.co</p>
      <p className="mt-0.5 text-sm text-muted">HAVOLA pls</p>
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs text-muted">
          Mos keldi: <span className="text-accent font-medium">GUIDE</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-success">
          Xususiy javob navbatda
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader />

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 border border-accent/20 bg-accent/5 px-3 py-1.5 rounded-full text-xs font-semibold text-accent">
            Rasmiy Meta API · 24/7 monitoring
          </div>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Izohlaringiz o&apos;zi ishlaydi
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-muted">
            Instagram post yoki reelga kalit so&apos;z izoh yozilganda, foydalanuvchiga avtomatik DM yuboriladi. Rasmiy Instagram API orqali, xavfsiz va ishonchli.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Boshlash
            </Link>
            <a
              href="https://t.me/ceo_syr"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground rounded-lg hover:bg-surface-hover transition-colors"
            >
              Telegram orqali so&apos;rash
            </a>
          </div>
        </div>

        <div className="relative">
          <DashboardPreview />
          <div className="absolute -bottom-6 -left-4 hidden lg:block">
            <MatchedCommentCard />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border bg-surface py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Qanday ishlaydi</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Izoh keldi — DM ketdi
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Uch qadam. Akkaunt ulang, kampaniya yarating va ishga tushiring.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {flowSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-lg border border-border bg-background p-6"
              >
                <p className="text-2xl font-bold text-accent/30">{step.number}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-accent">{step.eyebrow}</p>
                <h3 className="mt-2 text-base font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-6 lg:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Imkoniyatlar</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Kerakli hamma narsa
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Kampaniya boshqaruvi, DM jurnali, kuzatuvchi havolalar va jamoaviy workspace — hammasi bitta joyda.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {heroFeatures.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-accent/20 bg-accent/5 p-6"
            >
              <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center mb-4">
                <svg className="w-4 h-4 text-accent" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3"/>
                </svg>
              </div>
              <p className="text-base font-semibold text-foreground">{f.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {supportingFeatures.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                <svg className="w-3 h-3 text-accent" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-surface py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-accent/20 bg-accent/5 px-8 py-14 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Keyingi reelingizni biznes vositasiga aylantiring
            </h2>
            <p className="mt-4 text-base text-muted">
              Oylik to&apos;lov. Istalgan vaqt bekor qilish mumkin. Savol bo&apos;lsa — Telegram orqali javob beramiz.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center bg-accent px-8 py-3 text-sm font-semibold text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Boshlash
              </Link>
              <a
                href="https://t.me/ceo_syr"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center border border-border bg-surface px-8 py-3 text-sm font-semibold text-foreground rounded-lg hover:bg-surface-hover transition-colors"
              >
                Telegram orqali so&apos;rash
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
