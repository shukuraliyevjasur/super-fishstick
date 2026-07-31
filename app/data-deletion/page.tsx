import type { Metadata } from "next";
import LegalShell from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Ma'lumotlarni o'chirish / Data Deletion — replie",
  description:
    "How to disconnect Instagram and request deletion of your replie account and campaign data.",
};

export default function DataDeletionPage() {
  return (
    <LegalShell
      title="Ma'lumotlarni o'chirish / Data Deletion"
      description="Instagram ulanishingizni uzish va replie akkaunt va kampaniya ma'lumotlaringizni o'chirish bo'yicha ko'rsatmalar. Bu sahifa Meta App Review uchun ham ishlatiladi. / Instructions for disconnecting Instagram and requesting deletion of your replie account and campaign data. This page also serves Meta App Review requirements."
      updatedAt="July 31, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          1. Instagramni uzish / Disconnect Instagram
        </h2>
        <p className="text-foreground">
          Tizimga kiring, <strong>Sozlamalar</strong> sahifasini oching va <strong>Uzish</strong> tugmasini bosing. Bu saqlangan Instagram ulanish tokenini o&apos;chirib tashlaydi va ish maydoningiz uchun kampaniyalarning shaxsiy javoblar yuborishini darhol to&apos;xtatadi.
        </p>
        <p className="text-muted">
          Sign in, open <strong>Settings</strong>, and click <strong>Disconnect</strong>. This immediately removes the stored Instagram access token and stops all campaigns from sending private replies for your workspace.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          2. Ish maydoni ma&apos;lumotlarini o&apos;chirish / Delete Workspace Data
        </h2>
        <p className="text-foreground">
          Ish maydoni, kampaniya, jurnal, webhook va operatsion diagnostika ma&apos;lumotlarini o&apos;chirish uchun tizimga kirish uchun foydalanilgan elektron pochta manzilingizdan{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>{" "}
          manziliga xat yuboring. Xatda ish maydoni nomini va ulangan Instagram foydalanuvchi nomini ko&apos;rsating.
        </p>
        <p className="text-muted">
          To delete workspace, campaign, log, webhook, and diagnostic data, email{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>{" "}
          from the address used to sign in. Include the workspace name and the Instagram username connected to the workspace.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          3. Tasdiqlash / Verification
        </h2>
        <p className="text-foreground">
          Ma&apos;lumotlarni o&apos;chirishdan oldin biz elektron pochta manzilingiz yoki ulangan biznes akkauntingiz ustidan nazoratni tasdiqlashingizni so&apos;rashimiz mumkin. O&apos;chirish so&apos;rovlari huquqiy, firibgarlikdan himoya qilish yoki xavfsizlik sabablari bo&apos;yicha saqlash talab etilmasa, imkon qadar tezroq — odatda 30 kun ichida — ko&apos;rib chiqiladi.
        </p>
        <p className="text-muted">
          We may ask you to verify control of the email address or connected business account before deleting data. Deletion requests are processed as quickly as practical — typically within 30 days — unless retention is required for legal, fraud prevention, or security reasons.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          4. Aloqa / Contact
        </h2>
        <p className="text-foreground">
          Savollar yoki tezkor yordam uchun{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>{" "}
          manziliga yozing.
        </p>
        <p className="text-muted">
          For questions or urgent assistance, email{" "}
          <a href="mailto:info@replie.uz" className="text-accent hover:underline">
            info@replie.uz
          </a>
          .
        </p>
      </section>
    </LegalShell>
  );
}
