import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";
import PublicSiteFooter from "@/components/public-site-footer";

export const metadata: Metadata = {
  title: "replie - Instagram izohlarini DM ga aylantiring",
  description:
    "Instagram post yoki reelga kalit so'z izoh yozilganda, foydalanuvchiga avtomatik DM yuboriladi. Rasmiy Instagram API orqali.",
};

const stdIncluded = [
  "1 ta Instagram akkaunt",
  "5 ta faol kampaniya",
  "Kalit so'z aniqlash",
  "Avtomatik DM yuborish",
  "Ommaviy izoh javobi",
  "Kampaniya analitikasi",
  "Kampaniya tarixi",
];
const stdExcluded = [
  "Kirish xabari va interaktiv tugma",
  "Obuna tekshiruvi",
  "Kuzatilgan havolalar",
  "Ulashiladigan mijoz hisobotlari",
  "CSV fayldan yuklash",
  "Ko'p foydalanuvchi",
  "Prioritet qo'llab-quvvatlash",
];
const proFeatures = [
  "3 ta Instagram akkaunt",
  "Cheksiz kampaniya",
  "Kalit so'z aniqlash",
  "Avtomatik DM yuborish",
  "Ommaviy izoh javobi",
  "Kampaniya analitikasi",
  "Kampaniya tarixi",
  "Kirish xabari va interaktiv tugma",
  "Obuna tekshiruvi",
  "Kuzatilgan havolalar",
  "Ulashiladigan mijoz hisobotlari",
  "CSV fayldan yuklash",
  "Ko'p foydalanuvchi",
  "Prioritet qo'llab-quvvatlash",
];

function CheckIcon() {
  return (
    <svg style={{ width: 16, height: 16, flexShrink: 0, color: "#16A34A" }} viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg style={{ width: 16, height: 16, flexShrink: 0, color: "#DC2626", opacity: 0.5 }} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

const dashboardStats = [
  { label: "Faol kampaniya", value: "8",     color: "#1A1A1A" },
  { label: "DM Yuborilgan",  value: "1,284", color: "#0145F2" },
  { label: "O'tkazib yub.",  value: "42",    color: "#D97706" },
  { label: "Muvaffaqiyatsiz",value: "3",     color: "#DC2626" },
  { label: "Kliklar",        value: "356",   color: "#1A1A1A" },
  { label: "Bosish %",       value: "27.7%", color: "#16A34A" },
];

const chartBars = [
  { day: "Du", n: 42,  h: 28, o: 0.70 },
  { day: "Se", n: 68,  h: 45, o: 0.80 },
  { day: "Ch", n: 51,  h: 34, o: 0.75 },
  { day: "Pa", n: 94,  h: 63, o: 0.85 },
  { day: "Ju", n: 120, h: 80, o: 1.00 },
  { day: "Sh", n: 86,  h: 57, o: 0.85 },
  { day: "Ya", n: 73,  h: 49, o: 0.80 },
];

const activityRows = [
  { user: "@maya.co",     label: "Mahsulot yo'riqnomasi", status: "Yuborildi", color: "#16A34A" },
  { user: "@founder.ray", label: "Narx so'rovi",          status: "Yuborildi", color: "#16A34A" },
  { user: "@shop.ava",    label: "Bepul material",         status: "Navbatda",  color: "#D97706" },
];

const flowSteps = [
  { n: "01", eyebrow: "Ulang",         title: "Instagram akkauntingizni ulang",        desc: "Email orqali kiring va Instagram professional akkauntingizni bir marta ulang. Parol almashish yoki brauzer avtomatizatsiyasi yo'q." },
  { n: "02", eyebrow: "Yarating",      title: "Post, kalit so'z va DM matnini belgilang", desc: "Reel yoki post uchun kampaniya yarating: kuzatiladigan kalit so'z, ommaviy javob va yuboriladigan DM matni." },
  { n: "03", eyebrow: "Ishga tushiring", title: "Javoblar avtomatik yuboriladi",       desc: "Webhook izohlarni darhol ushlaydi, polling esa o'tkazib yuborilganlarini to'ldiradi. Har bir yuboruv navbatga olinadi, cheklangan va jurnallanadi." },
];

const heroFeatures = [
  {
    title: "Obuna tekshiruvi",
    desc: "Obuna bo'lmagan foydalanuvchi havolaga yetolmaydi. Bot tekshiradi — faqat obuna bo'lganda yuboradi.",
    icon: (
      <svg style={{ width: 22, height: 22, color: "#0145F2" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Kuzatuvchi havolalar",
    desc: "Har bir yuborilgan havolaga klik soni va CTR ko'rsatiladi — qaysi kampaniya ishlayotganini bilasiz.",
    icon: (
      <svg style={{ width: 22, height: 22, color: "#0145F2" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: "Xabarlar tarixi",
    desc: "Har bir xabar holati bilan saqlanadi: yuborildi, navbatda, muvaffaqiyatsiz.",
    icon: (
      <svg style={{ width: 22, height: 22, color: "#0145F2" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
];

const supportingFeatures = [
  "Email havola orqali kirish",
  "Bir nechta Instagram akkaunt",
  "Tokenlar xavfsiz saqlanadi",
  "Izohlarni avtomatik kuzatish",
  "Kalit so'zlar bo'yicha avtomatik xabar",
  "Jamoa uchun boshqaruv",
];

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#EDF1F5", color: "#1A1A1A" }}>
      <PublicSiteHeader />

      {/* ── HERO ── */}
      <section style={{ background: "#EDF1F5", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px 88px" }}>
          <div className="flex flex-col lg:flex-row items-center" style={{ gap: 56 }}>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0, maxWidth: 560 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(1,69,242,0.08)", border: "1px solid rgba(1,69,242,0.15)", padding: "6px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, color: "#0145F2" }}>
                <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Rasmiy Instagram · Doimo ishlaydi
              </div>

              <h1 style={{ margin: "24px 0 0", fontSize: "clamp(2.5rem, 4vw + 1rem, 3.75rem)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", color: "#1A1A1A" }}>
                Izohlaringiz o&apos;zi ishlaydi
              </h1>

              <p style={{ margin: "20px 0 0", fontSize: 17, lineHeight: 1.65, color: "#5B6472", maxWidth: 480 }}>
                Instagram post yoki reelsga kalit so&apos;z izoh yozilganda, foydalanuvchiga avtomatik DM yuboriladi. Rasmiy Instagram orqali, xavfsiz va ishonchli.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
                <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#0145F2", color: "#fff", fontSize: 15, fontWeight: 600, padding: "14px 28px", borderRadius: 10, textDecoration: "none", boxShadow: "0 4px 12px rgba(1,69,242,0.3)" }}>
                  Boshlash
                </Link>
                <a href="https://t.me/ceo_syr" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "#1A1A1A", fontSize: 15, fontWeight: 600, padding: "14px 28px", borderRadius: 10, border: "1px solid #E2E8EF", textDecoration: "none" }}>
                  Telegram orqali so&apos;rash
                </a>
              </div>
            </div>

            {/* Mockup */}
            <div className="w-full lg:max-w-[520px]" style={{ flex: 1, minWidth: 0, position: "relative" }}>
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 32px 64px -16px rgba(0,0,0,0.12), 0 16px 32px -8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                {/* Window chrome */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", background: "#F8F9FB", borderBottom: "1px solid #E2E8EF" }}>
                  {["", "", ""].map((_, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#E2E8EF", display: "inline-block" }} />)}
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#949CA9" }}>app / bosh sahifa</span>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>Salom, Maya!</div>
                  <div style={{ fontSize: 11, color: "#5B6472", marginTop: 3 }}>2 ta ulangan akkaunt · 340 ta kontakt</div>

                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
                    {dashboardStats.map((s) => (
                      <div key={s.label} style={{ background: "#F8F9FB", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, color: "#949CA9" }}>{s.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <div style={{ marginTop: 16, background: "#F8F9FB", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A1A" }}>DM, oxirgi 7 kun</div>
                    <div style={{ display: "flex", gap: 4, height: 90, marginTop: 10, alignItems: "flex-end", paddingTop: 16 }}>
                      {chartBars.map(({ day, n, h, o }) => (
                        <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 8, color: "#5B6472" }}>{n}</span>
                          <div style={{ width: "100%", height: h, background: "#0145F2", borderRadius: "3px 3px 0 0", opacity: o }} />
                          <span style={{ fontSize: 8, color: "#949CA9" }}>{day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity */}
                  <div style={{ marginTop: 16, background: "#F8F9FB", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A1A", marginBottom: 10 }}>So&apos;nggi faoliyat</div>
                    {activityRows.map(({ user, label, status, color }, i) => (
                      <div key={user} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < activityRows.length - 1 ? "1px solid #E2E8EF" : undefined, fontSize: 11 }}>
                        <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{user}</span>
                        <span style={{ color: "#5B6472" }}>{label}</span>
                        <span style={{ color, fontWeight: 600 }}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating comment card */}
              <div className="hidden lg:block" style={{ position: "absolute", bottom: -16, left: -32, width: 220, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 20px 40px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)", animation: "float 5s ease-in-out infinite" }}>
                <div style={{ fontSize: 10, color: "#949CA9", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Yangi izoh</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginTop: 6 }}>@maya.co</div>
                <div style={{ fontSize: 13, color: "#5B6472", marginTop: 2 }}>HAVOLA pls</div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E2E8EF" }}>
                  <div style={{ fontSize: 11, color: "#949CA9" }}>Mos keldi: <span style={{ color: "#0145F2", fontWeight: 700 }}>GUIDE</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, fontWeight: 600, color: "#16A34A" }}>
                    <svg style={{ width: 12, height: 12 }} viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                    Xususiy javob navbatda
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0145F2" }}>Qanday ishlaydi</div>
            <h2 style={{ margin: "12px 0 0", fontSize: "clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#1A1A1A" }}>Izoh keldi, DM ketdi</h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.6, color: "#5B6472" }}>Uch qadam. Akkaunt ulang, kampaniya yarating va ishga tushiring.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 20, marginTop: 48 }}>
            {flowSteps.map((step) => (
              <div key={step.n} style={{ background: "#F8F9FB", borderRadius: 14, padding: "32px 28px", border: "1px solid #E2E8EF" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(1,69,242,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#0145F2" }}>{step.n}</div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0145F2", marginTop: 20 }}>{step.eyebrow}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", marginTop: 8 }}>{step.title}</div>
                <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: "#5B6472" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: "#EDF1F5", padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0145F2" }}>Imkoniyatlar</div>
            <h2 style={{ margin: "12px 0 0", fontSize: "clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#1A1A1A" }}>Kerakli hamma narsa</h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.6, color: "#5B6472" }}>Kampaniyalar, xabarlar tarixi, kuzatuvchi havolalar va jamoa boshqaruvi. Hammasi bitta joyda.</p>
          </div>

          {/* Hero feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 20, marginTop: 48 }}>
            {heroFeatures.map((f) => (
              <div key={f.title} style={{ background: "#fff", borderRadius: 14, padding: "32px 28px", border: "1px solid #E2E8EF", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(1,69,242,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", marginTop: 20 }}>{f.title}</div>
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "#5B6472" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Supporting feature pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 12, marginTop: 20 }}>
            {supportingFeatures.map((feat) => (
              <div key={feat} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 10, padding: "16px 20px", border: "1px solid #E2E8EF" }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(1,69,242,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg style={{ width: 12, height: 12, color: "#0145F2" }} viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#1A1A1A" }}>Oddiy narx, kuchli natija</h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, color: "#5B6472" }}>Har oy. Istalgan vaqt bekor qilish mumkin.</p>
          </div>

          <div className="flex flex-col sm:flex-row" style={{ gap: 24 }}>
            {/* Standard */}
            <div style={{ flex: 1, background: "#fff", border: "1px solid #E2E8EF", borderRadius: 16, padding: "36px 32px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A" }}>Standart</div>
              <div style={{ fontSize: 14, color: "#5B6472", marginTop: 4 }}>Yakka tadbirkor va kichik biznes uchun</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 24 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.02em" }}>19 000</span>
                <span style={{ fontSize: 15, color: "#5B6472" }}>so&apos;m/oy</span>
              </div>
              <div style={{ marginTop: 28, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {stdIncluded.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#1A1A1A" }}>
                    <CheckIcon /><span>{feat}</span>
                  </div>
                ))}
                {stdExcluded.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#949CA9" }}>
                    <XIcon /><span>{feat}</span>
                  </div>
                ))}
              </div>
              <a href={`https://t.me/ceo_syr?text=${encodeURIComponent("Standart rejani olmoqchiman")}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 28, padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#1A1A1A", background: "#F3F6F9", border: "1px solid #E2E8EF", textDecoration: "none" }}>
                Standart rejani boshlash
              </a>
            </div>

            {/* Pro */}
            <div style={{ flex: 1, background: "linear-gradient(180deg, rgba(1,69,242,0.03) 0%, rgba(1,69,242,0.01) 100%)", border: "2px solid #0145F2", borderRadius: 16, padding: "36px 32px", display: "flex", flexDirection: "column", position: "relative" }}>
              <div style={{ position: "absolute", top: -14, right: 24, background: "#0145F2", color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 16px", borderRadius: 100 }}>Tavsiya etiladi</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A" }}>Pro</div>
              <div style={{ fontSize: 14, color: "#5B6472", marginTop: 4 }}>Kengayib borayotgan biznes va agentliklar uchun</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 24 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.02em" }}>29 000</span>
                <span style={{ fontSize: 15, color: "#5B6472" }}>so&apos;m/oy</span>
              </div>
              <div style={{ marginTop: 28, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {proFeatures.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#1A1A1A" }}>
                    <CheckIcon /><span>{feat}</span>
                  </div>
                ))}
              </div>
              <a href={`https://t.me/ceo_syr?text=${encodeURIComponent("Pro rejani olmoqchiman")}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 28, padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#fff", background: "#0145F2", textDecoration: "none", boxShadow: "0 4px 12px rgba(1,69,242,0.3)" }}>
                Pro rejani boshlash
              </a>
            </div>
          </div>

          <p style={{ textAlign: "center", margin: "32px 0 0", fontSize: 14, color: "#5B6472" }}>
            Savollar bormi?{" "}
            <a href="https://t.me/ceo_syr" target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#0145F2", textDecoration: "none" }}>
              Telegram orqali yozing
            </a>.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#0145F2", padding: "96px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#fff" }}>
            Keyingi reelsingizni biznes vositasiga aylantiring
          </h2>
          <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>
            Oylik to&apos;lov. Istalgan vaqt bekor qilish mumkin. Savol bo&apos;lsa — Telegram orqali javob beramiz.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "#0145F2", fontSize: 15, fontWeight: 700, padding: "14px 32px", borderRadius: 10, textDecoration: "none" }}>
              Boshlash
            </Link>
            <a href="https://t.me/ceo_syr" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#fff", fontSize: 15, fontWeight: 600, padding: "14px 32px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", textDecoration: "none" }}>
              Telegram orqali so&apos;rash
            </a>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
