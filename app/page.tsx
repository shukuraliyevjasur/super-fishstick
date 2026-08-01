import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";
import PublicSiteFooter from "@/components/public-site-footer";

export const metadata: Metadata = {
  title: "replie — izoh yozildi, DM jo'natildi",
  description:
    "Kimdir 'link?' deb izoh yozdi — replie darhol DM jo'natadi. Siz uxlayotgan bo'lsangiz ham. Rasmiy Instagram API orqali, xavfsiz va ishonchli.",
};


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

const steps = [
  { n: "1", title: "Akkauntingizni ulang", desc: "Instagram professional akkauntingizni bir marta ulang. Parol bermaysiz, bot o'rnatmaysiz — rasmiy API orqali." },
  { n: "2", title: "Kampaniya yarating", desc: "Qaysi post, qaysi kalit so'z, qanday DM — bir sahifada sozlaysiz. 5 daqiqa." },
  { n: "3", title: "Kontent yarating, replie ishlaydi", desc: "Yangi izoh keldi — DM jo'natildi. Siz yangi reel suratga olayapsiz, replie esa izoh yozganlarning har biriga javob beradi." },
];

const mainFeatures = [
  { title: "Faqat obunachilarga link", desc: "\"Obuna bo'l, havolani ol\" — replie buni avtomatik tekshiradi. Siz qo'lda tekshirmaysiz, hech kim aldamaydi." },
  { title: "Nechta klik? Kimdan?", desc: "Yuborgan havolangizni necha kishi ochdi — real vaqtda ko'rasiz. Qaysi kampaniya pul topayotganini bilasiz." },
  { title: "Tun o'rtasida ham, dam olishda ham", desc: "Tun o'rtasida, dam olish kunlari — farqi yo'q. Izoh yozildi, DM jo'natildi. Siz hech narsa qilmaysiz." },
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

            <div style={{ flex: 1, minWidth: 0, maxWidth: 560 }}>
              <h1 className="hero-enter" style={{ margin: 0, fontSize: "clamp(2.5rem, 4vw + 1rem, 3.75rem)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", color: "#1A1A1A" }}>
                Izoh yozildi —<br />DM jo&apos;natildi,<br />siz uxlayotgan bo&apos;lsangiz ham. :)
              </h1>

              <p className="hero-enter-d1" style={{ margin: "20px 0 0", fontSize: 17, lineHeight: 1.65, color: "#5B6472", maxWidth: 480 }}>
                Kimdir &quot;link?&quot; yoki &quot;narx?&quot; deb izoh yozdi — replie darhol DM jo&apos;natadi. Tun o&apos;rtasida ham, dam olish kunlari ham. Siz hech narsa qilmaysiz.
              </p>

              <div className="hero-enter-d2" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
                <Link href="/login" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#0145F2", color: "#fff", fontSize: 15, fontWeight: 600, padding: "14px 28px", borderRadius: 10, textDecoration: "none", boxShadow: "0 4px 12px rgba(1,69,242,0.3)" }}>
                  Bepul boshlash
                </Link>
                <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "#1A1A1A", fontSize: 15, fontWeight: 600, padding: "14px 28px", borderRadius: 10, border: "1px solid #E2E8EF", textDecoration: "none" }}>
                  Narxlarni ko&apos;rish
                </Link>
              </div>
            </div>

            <div className="w-full lg:max-w-[520px] hero-enter-mockup" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 32px 64px -16px rgba(0,0,0,0.12), 0 16px 32px -8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", background: "#F8F9FB", borderBottom: "1px solid #E2E8EF" }}>
                  {["", "", ""].map((_, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#E2E8EF", display: "inline-block" }} />)}
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#949CA9" }}>app / bosh sahifa</span>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>Salom, Maya!</div>
                  <div style={{ fontSize: 11, color: "#5B6472", marginTop: 3 }}>2 ta ulangan akkaunt · 340 ta kontakt</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
                    {dashboardStats.map((s) => (
                      <div key={s.label} style={{ background: "#F8F9FB", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, color: "#949CA9" }}>{s.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

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
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: 560 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#1A1A1A" }}>3 qadam. Keyin unutib yuboring.</h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.6, color: "#5B6472" }}>Bir marta sozlang — replie ishlay beradi. Siz kontent yaratishda davom eting.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 32, marginTop: 48 }}>
            {steps.map((step) => (
              <div key={step.n} style={{ borderTop: "2px solid #0145F2", paddingTop: 24 }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#0145F2", letterSpacing: "-0.02em", lineHeight: 1 }}>{step.n}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", marginTop: 16 }}>{step.title}</div>
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "#5B6472" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: "#EDF1F5", padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: 560 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#1A1A1A" }}>Birorta izoh javobsiz qolmaydi</h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.6, color: "#5B6472" }}>Javob kechiksa — mijoz ketadi. Siz uxlab yotganingizda ham replie bir soniyada javob beradi.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 32, marginTop: 48 }}>
            {mainFeatures.map((f) => (
              <div key={f.title} style={{ borderTop: "1px solid #C8D0DA", paddingTop: 24 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>{f.title}</div>
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "#5B6472" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "10px 32px", marginTop: 40, borderTop: "1px solid #D5DCE4", paddingTop: 32 }}>
            {supportingFeatures.map((feat) => (
              <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <svg style={{ width: 14, height: 14, flexShrink: 0, color: "#0145F2" }} viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                <span style={{ fontSize: 14, color: "#1A1A1A" }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#1A1A1A" }}>Avtomatik DM uchun oyligingizni yarmini berish shart emas.</h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, color: "#5B6472" }}>replie bepuldan boshlanadi — yoqsa, oyiga 4 somsani puli.</p>
          </div>

          <div className="flex flex-col sm:flex-row" style={{ gap: 16 }}>
            {[
              { tier: "Bepul", price: "0", note: "Sinab ko'rish uchun", color: "#5B6472" },
              { tier: "Standart", price: "47 000", note: "so'm/oy · Kontentmakerlar uchun", color: "#0145F2" },
              { tier: "Pro", price: "87 000", note: "so'm/oy · Hamma narsa bor", color: "#0145F2" },
            ].map(({ tier, price, note, color }) => (
              <div key={tier} style={{ flex: 1, background: "#F8F9FB", border: "1px solid #E2E8EF", borderRadius: 12, padding: "24px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#949CA9", textTransform: "uppercase", letterSpacing: "0.05em" }}>{tier}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{price}</div>
                <div style={{ fontSize: 13, color: "#5B6472" }}>{note}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#0145F2", background: "#EEF2FF", border: "1px solid #C7D2FE", textDecoration: "none" }}>
              Batafsil narxlarni ko&apos;rish →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#0145F2", padding: "96px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", color: "#fff" }}>
            Keyingi reelingizdan birinchi mijozingizni qo&apos;ldan chiqarmang
          </h2>
          <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>
            Hozir bepul boshlang. Kredit karta kerak emas. Ishlayotganini ko&apos;rsangiz — keyin o&apos;ylab ko&apos;rasiz.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "#0145F2", fontSize: 15, fontWeight: 700, padding: "14px 32px", borderRadius: 10, textDecoration: "none" }}>
              Bepul boshlash
            </Link>
            <a href="https://t.me/ceo_syr" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#fff", fontSize: 15, fontWeight: 600, padding: "14px 32px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", textDecoration: "none" }}>
              Savol bormi? Yozing
            </a>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
