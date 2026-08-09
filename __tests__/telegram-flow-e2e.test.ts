/**
 * E10, path 2: a complete flow conversation from /start to finish.
 *
 * Unlike telegram-flow.test.ts (which tests individual phases), this chains
 * multiple processTelegramUpdate calls to walk a branching flow end-to-end,
 * verifying that state accumulates correctly across turns.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPrisma,
  mockSendMessage,
  mockReserveSlot,
  mockAnswerCallbackQuery,
} = vi.hoisted(() => ({
  mockPrisma: {
    automation: { findUnique: vi.fn() },
    telegramFlow: { findFirst: vi.fn() },
    telegramConversation: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
  mockSendMessage: vi.fn(),
  mockReserveSlot: vi.fn(),
  mockAnswerCallbackQuery: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/telegram/client", () => ({
  getSharedBot: () => ({ api: { answerCallbackQuery: mockAnswerCallbackQuery } }),
  reserveTelegramSlot: mockReserveSlot,
  sendMessage: mockSendMessage,
}));
vi.mock("@/lib/telegram/link", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/telegram/link")>()),
  redeemLinkCode: vi.fn().mockResolvedValue(null),
}));

const { processTelegramUpdate } = await import("@/lib/queue/telegram-worker");
const { BOT_COPY } = await import("@/lib/telegram/copy");

const BRANCHING_FLOW = [
  {
    id: "greeting",
    message: "Salom {username}! Nima xizmat?",
    saveAnswerAs: "service",
    options: [
      { label: "Narxlar", nextStepId: "price-ask" },
      { label: "Manzil", nextStepId: "address" },
    ],
  },
  {
    id: "price-ask",
    message: "Qaysi mahsulot?",
    saveAnswerAs: "product",
    options: [
      { label: "Telefon", nextStepId: "phone-collect" },
      { label: "Noutbuk", nextStepId: "phone-collect" },
    ],
  },
  {
    id: "address",
    message: "Manzilimiz: Toshkent, Amir Temur 1",
    nextStepId: null,
  },
  {
    id: "phone-collect",
    message: "Telefon raqamingizni yozing",
    saveAnswerAs: "phone",
    nextStepId: null,
  },
];

function textUpdate(text: string) {
  return {
    update_id: Math.random(),
    message: {
      text,
      from: { id: 777, first_name: "Nodira" },
      chat: { id: 888 },
    },
  };
}

function tapUpdate(optionIndex: number) {
  return {
    update_id: Math.random(),
    callback_query: {
      id: `cbq-${Math.random()}`,
      data: `opt:${optionIndex}`,
      from: { id: 777, first_name: "Nodira" },
      message: { chat: { id: 888 } },
    },
  };
}

function sentTexts(): string[] {
  return mockSendMessage.mock.calls.map((call) => call[2] as string);
}


describe("complete flow conversation (E10 path 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReserveSlot.mockResolvedValue(true);
    mockSendMessage.mockResolvedValue({ ok: true, messageId: 1 });
    mockAnswerCallbackQuery.mockResolvedValue(undefined);
    mockPrisma.telegramConversation.upsert.mockResolvedValue({});
    mockPrisma.telegramConversation.update.mockResolvedValue({});
  });

  it("walks /start → branch A (tap) → product (tap) → phone (free text) → finish", async () => {
    // Turn 1: /start camp1
    mockPrisma.automation.findUnique.mockResolvedValue({
      id: "camp1",
      workspaceId: "ws1",
    });
    mockPrisma.telegramFlow.findFirst.mockResolvedValue({
      id: "flow1",
      steps: BRANCHING_FLOW,
    });
    mockPrisma.telegramConversation.findFirst.mockResolvedValue(null);

    await processTelegramUpdate(textUpdate("/start camp1"));

    expect(sentTexts()).toEqual(["Salom Nodira! Nima xizmat?"]);
    expect(mockPrisma.telegramConversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ currentStepId: "greeting" }),
      })
    );

    // Turn 2: tap "Narxlar" (index 0) → goes to price-ask
    mockSendMessage.mockClear();
    mockPrisma.telegramConversation.findFirst.mockResolvedValue({
      id: "conv1",
      currentStepId: "greeting",
      answers: {},
      flow: { steps: BRANCHING_FLOW },
    });

    await processTelegramUpdate(tapUpdate(0));

    expect(sentTexts()).toEqual(["Qaysi mahsulot?"]);
    expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStepId: "price-ask",
          answers: { service: "Narxlar" },
        }),
      })
    );

    // Turn 3: tap "Noutbuk" (index 1) → goes to phone-collect
    mockSendMessage.mockClear();
    mockPrisma.telegramConversation.findFirst.mockResolvedValue({
      id: "conv1",
      currentStepId: "price-ask",
      answers: { service: "Narxlar" },
      flow: { steps: BRANCHING_FLOW },
    });

    await processTelegramUpdate(tapUpdate(1));

    expect(sentTexts()).toEqual(["Telefon raqamingizni yozing"]);
    expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStepId: "phone-collect",
          answers: { service: "Narxlar", product: "Noutbuk" },
        }),
      })
    );

    // Turn 4: type phone number (free text) → finishes
    mockSendMessage.mockClear();
    mockPrisma.telegramConversation.findFirst.mockResolvedValue({
      id: "conv1",
      currentStepId: "phone-collect",
      answers: { service: "Narxlar", product: "Noutbuk" },
      flow: { steps: BRANCHING_FLOW },
    });

    await processTelegramUpdate(textUpdate("+998901234567"));

    expect(sentTexts()).toEqual([BOT_COPY.finished]);
    expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStepId: null,
          answers: {
            service: "Narxlar",
            product: "Noutbuk",
            phone: "+998901234567",
          },
        }),
      })
    );
  });

  it("walks /start → branch B (address step) → any reply finishes", async () => {
    // Turn 1: /start
    mockPrisma.automation.findUnique.mockResolvedValue({
      id: "camp1",
      workspaceId: "ws1",
    });
    mockPrisma.telegramFlow.findFirst.mockResolvedValue({
      id: "flow1",
      steps: BRANCHING_FLOW,
    });
    mockPrisma.telegramConversation.findFirst.mockResolvedValue(null);

    await processTelegramUpdate(textUpdate("/start camp1"));

    // Turn 2: tap "Manzil" (index 1) → lands on address step
    mockSendMessage.mockClear();
    mockPrisma.telegramConversation.findFirst.mockResolvedValue({
      id: "conv1",
      currentStepId: "greeting",
      answers: {},
      flow: { steps: BRANCHING_FLOW },
    });

    await processTelegramUpdate(tapUpdate(1));

    expect(sentTexts()).toContain("Manzilimiz: Toshkent, Amir Temur 1");
    expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStepId: "address",
          answers: { service: "Manzil" },
        }),
      })
    );

    // Turn 3: any reply on a step with nextStepId: null and no options → finishes
    mockSendMessage.mockClear();
    mockPrisma.telegramConversation.update.mockClear();
    mockPrisma.telegramConversation.findFirst.mockResolvedValue({
      id: "conv1",
      currentStepId: "address",
      answers: { service: "Manzil" },
      flow: { steps: BRANCHING_FLOW },
    });

    await processTelegramUpdate(textUpdate("rahmat"));

    expect(sentTexts()).toEqual([BOT_COPY.finished]);
    expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentStepId: null }),
      })
    );
  });
});
