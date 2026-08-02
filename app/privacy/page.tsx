import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati / Privacy Policy — replie",
  description:
    "How replie handles Instagram account data, webhook payloads, and customer campaign information.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Maxfiylik siyosati / Privacy Policy"
      description="replie foydalanuvchilarning Instagram akkaunt ma'lumotlarini, kampaniya sozlamalarini va tizim jurnallarini qanday ishlashini tushuntiradi. / replie explains how it handles your Instagram account data, campaign settings, and system logs."
      updatedAt="July 31, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          1. Biz to&apos;playdigan ma&apos;lumotlar / Data We Collect
        </h2>
        <p className="text-foreground">
          Biz autentifikatsiya uchun elektron pochta manzillarini, ulangan Instagram akkaunt identifikatorlarini, shifrlangan Instagram kirish tokenlarini, kampaniya sozlamalarini, webhook yuklamalarini, izoh matnlarini, yetkazib berish jurnallarini va operatsion diagnostika ma&apos;lumotlarini to&apos;playmiz.
        </p>
        <p className="text-muted">
          We collect email addresses for authentication, connected Instagram account identifiers, encrypted Instagram access tokens, campaign settings, webhook payloads, comment text needed to process campaigns, delivery logs, and operational diagnostics.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          2. Ma&apos;lumotlardan foydalanish / How We Use Data
        </h2>
        <p className="text-foreground">
          Ma&apos;lumotlar foydalanuvchilarni autentifikatsiya qilish, Instagram integratsiyalarini ulash, izoh kalit so&apos;zlarini moslash, rasmiy Meta API orqali shaxsiy javoblar yuborish, takroriy yuborishlarning oldini olish, xatoliklarni bartaraf etish va xizmatni himoya qilish uchun ishlatiladi.
        </p>
        <p className="text-muted">
          We use data to authenticate users, connect Instagram integrations, match comment keywords, send private replies through the official Meta APIs, prevent duplicate sends, troubleshoot failures, and protect the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          3. Instagram va Meta ma&apos;lumotlari / Instagram and Meta Data
        </h2>
        <p className="text-foreground">
          replie Instagram parollarini so&apos;ramaydi, Instagramni skrap qilmaydi yoki brauzer avtomatizatsiyasidan foydalanmaydi. Instagram tokenlari tinch holatda shifrlanadi va faqat ulangan biznes akkaunt tomonidan ruxsat etilgan amallarni bajarish uchun ishlatiladi.
        </p>
        <p className="text-muted">
          replie does not ask for Instagram passwords, scrape Instagram, or use browser automation. Instagram tokens are encrypted at rest and used only to perform actions authorized by the connected business account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          4. Subprotsessorlar / Subprocessors
        </h2>
        <p className="text-foreground">
          Ishlab chiqarish xizmati hosting, ma&apos;lumotlar bazasi, Redis navbati, elektron pochta va kuzatish provayderlaridan foydalanishi mumkin. Ushbu provayderlar faqat xizmatni ishlatish uchun zarur bo&apos;lgan darajada ma&apos;lumotlarni qayta ishlaydi.
        </p>
        <p className="text-muted">
          The production service may use hosting, database, Redis queue, email, and observability providers. These providers process data only as needed to run the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          5. Saqlash va o&apos;chirish / Retention and Deletion
        </h2>
        <p className="text-foreground">
          Foydalanuvchilar sozlamalarda Instagramni uzishi mumkin, bu esa saqlangan ulanishni o&apos;chirib tashlaydi va kampaniyalarni to&apos;xtatadi. Akkaunt yoki ma&apos;lumotlarni to&apos;liq o&apos;chirish uchun pastdagi havoladan <em>Ma&apos;lumotlarni o&apos;chirish</em> sahifasiga o&apos;ting.
        </p>
        <p className="text-muted">
          Users can disconnect Instagram from Settings, which removes the stored connection and stops campaigns. For full account or data deletion, visit the <Link href="/data-deletion" className="text-accent hover:underline">Data Deletion</Link> page linked in the footer.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          6. Aloqa / Contact
        </h2>
        <p className="text-foreground">
          Maxfiylik bo&apos;yicha savollar uchun{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>{" "}
          manziliga yozing yoki{" "}
          <span className="font-medium">replie.uz</span> saytidagi aloqa sahifasiga murojaat qiling.
        </p>
        <p className="text-muted">
          For privacy questions, email{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>{" "}
          or visit the contact page at replie.uz.
        </p>
      </section>
    </LegalShell>
  );
}
