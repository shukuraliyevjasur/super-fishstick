/**
 * Flow templates (D3).
 *
 * A new flow's empty state is a **template picker**, not a blank page: three
 * complete working funnels the user edits. That demonstrates the model instead
 * of explaining it, and doubles as onboarding — which matters more here than
 * usual, because the target user is an SMM worker on a phone, not someone who
 * will read documentation about branching.
 *
 * Every template must pass `validateFlow` — a template that ships broken
 * teaches the wrong thing on someone's first contact with the product. There is
 * a test that asserts exactly that.
 *
 * Uzbek only for now. D3 calls for Uzbek *and* Russian; Russian copy needs a
 * translator rather than an engineer, and shipping machine-translated funnels
 * to the customer's customer is worse than shipping one language well.
 */

import type { FlowStep } from "@/lib/telegram/flow-types";

export interface FlowTemplate {
  id: string;
  /** Shown on the picker card. */
  name: string;
  /** One line on what the funnel is for. */
  description: string;
  steps: FlowStep[];
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "price-enquiry",
    name: "Narx so'rovi",
    description: "Mijoz nima olishini aniqlab, telefon raqamini oladi.",
    steps: [
      {
        id: "start",
        message:
          "Salom {username}! 👋 Qaysi mahsulot narxi qiziqtiryapti?",
        saveAnswerAs: "mahsulot",
        options: [
          { label: "Kiyim", nextStepId: "budget" },
          { label: "Aksessuar", nextStepId: "budget" },
          { label: "Boshqa", nextStepId: "other" },
        ],
      },
      {
        id: "other",
        message: "Nima qiziqtirganini yozib qoldiring 👇",
        saveAnswerAs: "boshqa_mahsulot",
        nextStepId: "budget",
      },
      {
        id: "budget",
        message: "Tushunarli. Taxminiy byudjetingiz qancha?",
        saveAnswerAs: "byudjet",
        options: [
          { label: "500 ming so'mgacha", nextStepId: "phone" },
          { label: "500 ming — 1 mln", nextStepId: "phone" },
          { label: "1 mln dan yuqori", nextStepId: "phone" },
        ],
      },
      {
        id: "phone",
        message:
          "Ajoyib! Telefon raqamingizni yozing — menejerimiz siz bilan bog'lanadi 📞",
        saveAnswerAs: "telefon",
        nextStepId: "done",
      },
      {
        id: "done",
        message: "Rahmat! 🙏 Tez orada aloqaga chiqamiz.",
        nextStepId: null,
      },
    ],
  },
  {
    id: "booking",
    name: "Navbatga yozilish",
    description: "Xizmat va vaqtni tanlatib, bandlikni qabul qiladi.",
    steps: [
      {
        id: "start",
        message: "Salom {username}! Qaysi xizmatga yozilmoqchisiz?",
        saveAnswerAs: "xizmat",
        options: [
          { label: "Soch olish", nextStepId: "day" },
          { label: "Soqol", nextStepId: "day" },
          { label: "Ikkalasi", nextStepId: "day" },
        ],
      },
      {
        id: "day",
        message: "Qaysi kunga qulay?",
        saveAnswerAs: "kun",
        options: [
          { label: "Bugun", nextStepId: "time" },
          { label: "Ertaga", nextStepId: "time" },
          { label: "Boshqa kun", nextStepId: "custom_day" },
        ],
      },
      {
        id: "custom_day",
        message: "Qaysi kun va sanani yozing 👇",
        saveAnswerAs: "boshqa_kun",
        nextStepId: "time",
      },
      {
        id: "time",
        message: "Soat nechchida qulay?",
        saveAnswerAs: "vaqt",
        options: [
          { label: "Ertalab", nextStepId: "phone" },
          { label: "Tushdan keyin", nextStepId: "phone" },
          { label: "Kechqurun", nextStepId: "phone" },
        ],
      },
      {
        id: "phone",
        message: "Telefon raqamingizni qoldiring — tasdiqlash uchun 📞",
        saveAnswerAs: "telefon",
        nextStepId: "done",
      },
      {
        id: "done",
        message: "Yozildingiz ✅ Tez orada tasdiqlaymiz.",
        nextStepId: null,
      },
    ],
  },
  {
    id: "catalogue",
    name: "Katalog yuborish",
    description: "Yo'nalishni aniqlab, mos katalogni yuboradi.",
    steps: [
      {
        id: "start",
        message: "Salom {username}! Katalogimizni yuboraman 📚 Kim uchun qidiryapsiz?",
        saveAnswerAs: "kim_uchun",
        options: [
          { label: "O'zim uchun", nextStepId: "size" },
          { label: "Sovg'a uchun", nextStepId: "gift" },
        ],
      },
      {
        id: "gift",
        message: "Sovg'a kimga? Bir og'iz yozib qoldiring 🎁",
        saveAnswerAs: "sovga_kimga",
        nextStepId: "send",
      },
      {
        id: "size",
        message: "Qaysi o'lcham kerak?",
        saveAnswerAs: "olcham",
        options: [
          { label: "S / M", nextStepId: "send" },
          { label: "L / XL", nextStepId: "send" },
          { label: "Bilmayman", nextStepId: "send" },
        ],
      },
      {
        id: "send",
        message: "Mana katalogimiz 👉 {link}\n\nSavolingiz bo'lsa shu yerda yozing.",
        nextStepId: null,
      },
    ],
  },
];

export const FLOW_TEMPLATES_RU: FlowTemplate[] = [
  {
    id: "price-enquiry-ru",
    name: "Запрос цены",
    description: "Выясняет, что нужно клиенту, и берёт номер телефона.",
    steps: [
      {
        id: "start",
        message: "Привет {username}! 👋 Какой товар вас интересует?",
        saveAnswerAs: "товар",
        options: [
          { label: "Одежда", nextStepId: "budget" },
          { label: "Аксессуары", nextStepId: "budget" },
          { label: "Другое", nextStepId: "other" },
        ],
      },
      {
        id: "other",
        message: "Напишите, что именно вас интересует 👇",
        saveAnswerAs: "другой_товар",
        nextStepId: "budget",
      },
      {
        id: "budget",
        message: "Понятно. Какой у вас примерный бюджет?",
        saveAnswerAs: "бюджет",
        options: [
          { label: "До 500 тыс. сум", nextStepId: "phone" },
          { label: "500 тыс. — 1 млн", nextStepId: "phone" },
          { label: "Больше 1 млн", nextStepId: "phone" },
        ],
      },
      {
        id: "phone",
        message:
          "Отлично! Оставьте номер телефона — менеджер свяжется с вами 📞",
        saveAnswerAs: "телефон",
        nextStepId: "done",
      },
      {
        id: "done",
        message: "Спасибо! 🙏 Скоро выйдем на связь.",
        nextStepId: null,
      },
    ],
  },
  {
    id: "booking-ru",
    name: "Запись на приём",
    description: "Выбирает услугу и время, принимает заявку.",
    steps: [
      {
        id: "start",
        message: "Привет {username}! На какую услугу хотите записаться?",
        saveAnswerAs: "услуга",
        options: [
          { label: "Стрижка", nextStepId: "day" },
          { label: "Борода", nextStepId: "day" },
          { label: "Оба", nextStepId: "day" },
        ],
      },
      {
        id: "day",
        message: "На какой день удобно?",
        saveAnswerAs: "день",
        options: [
          { label: "Сегодня", nextStepId: "time" },
          { label: "Завтра", nextStepId: "time" },
          { label: "Другой день", nextStepId: "custom_day" },
        ],
      },
      {
        id: "custom_day",
        message: "Напишите дату 👇",
        saveAnswerAs: "другой_день",
        nextStepId: "time",
      },
      {
        id: "time",
        message: "В какое время удобно?",
        saveAnswerAs: "время",
        options: [
          { label: "Утром", nextStepId: "phone" },
          { label: "Днём", nextStepId: "phone" },
          { label: "Вечером", nextStepId: "phone" },
        ],
      },
      {
        id: "phone",
        message: "Оставьте номер — пришлём подтверждение 📞",
        saveAnswerAs: "телефон",
        nextStepId: "done",
      },
      {
        id: "done",
        message: "Записали ✅ Скоро подтвердим.",
        nextStepId: null,
      },
    ],
  },
  {
    id: "catalogue-ru",
    name: "Отправка каталога",
    description: "Уточняет цель и отправляет подходящий каталог.",
    steps: [
      {
        id: "start",
        message:
          "Привет {username}! Отправлю каталог 📚 Для кого ищете?",
        saveAnswerAs: "для_кого",
        options: [
          { label: "Для себя", nextStepId: "size" },
          { label: "В подарок", nextStepId: "gift" },
        ],
      },
      {
        id: "gift",
        message: "Кому подарок? Напишите пару слов 🎁",
        saveAnswerAs: "подарок_кому",
        nextStepId: "send",
      },
      {
        id: "size",
        message: "Какой размер нужен?",
        saveAnswerAs: "размер",
        options: [
          { label: "S / M", nextStepId: "send" },
          { label: "L / XL", nextStepId: "send" },
          { label: "Не знаю", nextStepId: "send" },
        ],
      },
      {
        id: "send",
        message:
          "Вот наш каталог 👉 {link}\n\nЕсли есть вопросы — пишите здесь.",
        nextStepId: null,
      },
    ],
  },
];

export function getFlowTemplate(id: string): FlowTemplate | null {
  return (
    FLOW_TEMPLATES.find((t) => t.id === id) ??
    FLOW_TEMPLATES_RU.find((t) => t.id === id) ??
    null
  );
}
