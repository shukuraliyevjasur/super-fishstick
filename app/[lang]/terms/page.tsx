import type { Metadata } from "next";
import LegalShell from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Foydalanish shartlari / Terms of Service — replie",
  description:
    "Terms for using replie's Instagram comment-to-DM automation service.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Foydalanish shartlari / Terms of Service"
      description="Ushbu shartlar replie Instagram avtomatlashtirish xizmatidan maqbul foydalanishni belgilaydi. / These terms define acceptable use for replie's Instagram comment-to-DM automation service."
      updatedAt="July 31, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          1. Ruxsat etilgan foydalanish / Authorized Use
        </h2>
        <p className="text-foreground">
          replie xizmatidan faqat siz egalik qiladigan yoki boshqarish uchun vakolat olgan Instagram professional akkauntlari bilan foydalanishingiz mumkin. Siz sozlaydigan kampaniyalar, kalit so&apos;zlar, havolalar va xabarlar uchun to&apos;liq javobgarsiz.
        </p>
        <p className="text-muted">
          You may use replie only with Instagram professional accounts you own or are authorized to manage. You are responsible for the campaigns, keywords, links, and messages you configure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          2. Platforma qoidalariga rioya qilish / Platform Compliance
        </h2>
        <p className="text-foreground">
          Siz Meta Platforma Shartlari, Instagram siyosatlari, tegishli xabar almashish qoidalari, maxfiylik qonunlari va spam-ga qarshi qonunlarga rioya qilishga rozisiz. replie muvofiqlik, suiiste&apos;mol yoki xavfsizlik xavfini keltirib chiqaradigan kampaniyalarni tezlik chegaralashi, to&apos;xtatishi yoki o&apos;chirib qo&apos;yishi mumkin.
        </p>
        <p className="text-muted">
          You agree to follow Meta Platform Terms, Instagram policies, applicable messaging rules, privacy laws, and anti-spam laws. replie may rate-limit, pause, or disable campaigns that create compliance, abuse, or security risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          3. Mavjudlik / Availability
        </h2>
        <p className="text-foreground">
          replie Meta, elektron pochta, hosting, ma&apos;lumotlar bazasi va navbat provayderlarini o&apos;z ichiga olgan uchinchi tomon platformalariga bog&apos;liq. Biz xizmatni ishonchli tarzda boshqarishga harakat qilamiz, ammo uzluksiz mavjudlik kafolatlanmaydi.
        </p>
        <p className="text-muted">
          replie depends on third-party platforms including Meta, email, hosting, database, and queue providers. We work to operate the service reliably, but uninterrupted availability is not guaranteed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          4. To&apos;lovlar / Payments
        </h2>
        <p className="text-foreground">
          Obuna to&apos;lovlari oldindan to&apos;lanadi va qaytarib berilmaydi. Obunani istalgan vaqt bekor qilishingiz mumkin — keyingi hisob-kitob davridan boshlab yangilanishlar to&apos;xtatiladi. Narx o&apos;zgarishlari kamida 14 kun oldin e&apos;lon qilinadi.
        </p>
        <p className="text-muted">
          Subscription fees are paid in advance and are non-refundable. You may cancel at any time — renewals stop at the start of the next billing period. Price changes are announced at least 14 days in advance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          5. Xizmatni to&apos;xtatish / Termination
        </h2>
        <p className="text-foreground">
          Ushbu shartlarni buzgan taqdirda yoki xizmat ishlashiga ziyon etkazadigan foydalanish holatlarida biz akkauntingizni to&apos;xtatib qo&apos;yishimiz yoki xizmatga kirishni o&apos;chirib qo&apos;yishimiz mumkin. Siz istalgan vaqt akkauntingizni bekor qilishingiz mumkin.
        </p>
        <p className="text-muted">
          We may suspend your account or disable access upon violation of these terms or usage that harms the service. You may cancel your account at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          6. Javobgarlikni cheklash / Limitation of Liability
        </h2>
        <p className="text-foreground">
          replie Meta API o&apos;zgarishlari, tarmoq uzilishlari yoki kampaniya natijalari uchun javobgar emas. Xizmat &quot;xuddi shunday&quot; taqdim etiladi va hech qanday aniq yoki ko&apos;zda tutilmagan kafolatlar berilmaydi.
        </p>
        <p className="text-muted">
          replie is not liable for Meta API changes, network outages, or campaign results. The service is provided &quot;as-is&quot; without any express or implied warranties.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          7. Aloqa / Contact
        </h2>
        <p className="text-foreground">
          Savollar uchun{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>{" "}
          manziliga murojaat qiling.
        </p>
        <p className="text-muted">
          For questions, contact us at{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>
          .
        </p>
      </section>
    </LegalShell>
  );
}
