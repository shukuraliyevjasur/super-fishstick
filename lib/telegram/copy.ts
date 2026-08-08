/**
 * Bot-facing copy (T5, T6).
 *
 * Separate from `lib/i18n` on purpose: those strings are the dashboard, chosen
 * by the SMM worker's own locale. These are spoken by the bot to *their*
 * customer, and the audience is Uzbek-speaking (D3's flow templates are Uzbek
 * and Russian). Per-workspace bot language belongs to the flow editor, not to
 * the dashboard locale, so there is nothing to key off yet.
 *
 * All of it is placeholder-quality product copy written by an engineer. It is
 * in one file precisely so the owner can rewrite it without touching the
 * engine.
 */

export const BOT_COPY = {
  /** No `/start` payload and no conversation to resume — someone found the bot directly. */
  noPayload:
    "Salom! 👋 Men replie botiman.\n\n" +
    "Menga to'g'ridan-to'g'ri emas, biror kampaniya havolasi orqali kirsangiz, " +
    "sizga kerakli ma'lumotni yuboraman.",

  /** The payload did not resolve to a campaign — deleted, or someone typed nonsense. */
  unknownCampaign:
    "Bu havola endi ishlamaydi. 😕\n\n" +
    "Kampaniya o'chirilgan yoki havola noto'g'ri bo'lishi mumkin. " +
    "Iltimos, yangi havolani so'rang.",

  /** The campaign exists but its workspace has no flow to run. */
  noFlow:
    "Rahmat! Hozircha bu kampaniya uchun savol-javob sozlanmagan. " +
    "Tez orada siz bilan bog'lanamiz.",

  /** The flow exists but has no usable steps. Same user-facing outcome, different cause. */
  emptyFlow:
    "Rahmat! Hozircha bu kampaniya uchun savol-javob sozlanmagan. " +
    "Tez orada siz bilan bog'lanamiz.",

  /** T6 — the reply matched no option. Never leave the user without a response. */
  noMatch:
    "Kechirasiz, tushunmadim. 🤔 Quyidagi variantlardan birini tanlang:",

  /** The conversation ran off the end of the flow. */
  finished: "Rahmat! 🙏 Javoblaringiz qabul qilindi.",
} as const;
