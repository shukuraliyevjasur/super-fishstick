import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSendMessage, mockReserveSlot, mockAnswerCallbackQuery } =
  vi.hoisted(() => ({
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

const { processTelegramUpdate, parseStartPayload, parseIncomingEvent } =
  await import("@/lib/queue/telegram-worker");
const { BOT_COPY } = await import("@/lib/telegram/copy");

const FLOW_STEPS = [
  {
    id: "s1",
    message: "Salom {username}! Nima qiziqtiradi?",
    saveAnswerAs: "interest",
    options: [
      { label: "Narx", nextStepId: "s2" },
      { label: "Manzil", nextStepId: null },
    ],
  },
  {
    id: "s2",
    message: "Telefon raqamingizni yozing",
    saveAnswerAs: "phone",
    nextStepId: null,
  },
];

function textUpdate(text: string, userId = 555) {
  return {
    update_id: 1,
    message: {
      text,
      from: { id: userId, first_name: "Aziz" },
      chat: { id: 999 },
    },
  };
}

function tapUpdate(optionIndex: number, userId = 555) {
  return {
    update_id: 2,
    callback_query: {
      id: "cbq-1",
      data: `opt:${optionIndex}`,
      from: { id: userId, first_name: "Aziz" },
      message: { chat: { id: 999 } },
    },
  };
}

/** Every text the bot sent during a call, in order. */
function sentTexts(): string[] {
  return mockSendMessage.mock.calls.map((call) => call[2] as string);
}

describe("Telegram flow engine (T5, T6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReserveSlot.mockResolvedValue(true);
    mockSendMessage.mockResolvedValue({ ok: true, messageId: 1 });
    mockAnswerCallbackQuery.mockResolvedValue(undefined);
    mockPrisma.telegramConversation.findFirst.mockResolvedValue(null);
    mockPrisma.telegramConversation.upsert.mockResolvedValue({});
    mockPrisma.telegramConversation.update.mockResolvedValue({});
  });

  describe("parsing", () => {
    it("extracts a /start payload", () => {
      expect(parseStartPayload("/start abc123")).toBe("abc123");
      expect(parseStartPayload("/start")).toBeNull();
      expect(parseStartPayload("  /start   abc123  ")).toBe("abc123");
      expect(parseStartPayload("salom")).toBeNull();
    });

    it("normalizes both a text message and a button tap", () => {
      expect(parseIncomingEvent(textUpdate("salom"))).toMatchObject({
        chatId: 999,
        text: "salom",
        optionIndex: null,
      });
      expect(parseIncomingEvent(tapUpdate(1))).toMatchObject({
        chatId: 999,
        text: null,
        optionIndex: 1,
        callbackQueryId: "cbq-1",
      });
    });

    it("ignores update types the engine does not act on", async () => {
      expect(parseIncomingEvent({ update_id: 3, edited_message: {} })).toBeNull();
      expect(parseIncomingEvent({ update_id: 4, channel_post: {} })).toBeNull();

      // And ignoring means no send and no throw — an unknown update type must
      // not fail a job and retry forever.
      await expect(
        processTelegramUpdate({ update_id: 5, my_chat_member: {} })
      ).resolves.toBeUndefined();
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("/start (T5)", () => {
    it("starts a conversation at the entry step for a valid campaign", async () => {
      mockPrisma.automation.findUnique.mockResolvedValue({
        id: "camp1",
        workspaceId: "ws1",
      });
      mockPrisma.telegramFlow.findFirst.mockResolvedValue({
        id: "flow1",
        steps: FLOW_STEPS,
      });

      await processTelegramUpdate(textUpdate("/start camp1"));

      expect(mockPrisma.telegramConversation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            workspaceId: "ws1",
            flowId: "flow1",
            currentStepId: "s1",
          }),
        })
      );
      // Entry step, personalized, with its keyboard attached.
      expect(sentTexts()[0]).toBe("Salom Aziz! Nima qiziqtiradi?");
      expect(mockSendMessage.mock.calls[0][3]).toEqual({
        reply_markup: {
          inline_keyboard: [
            [{ text: "Narx", callback_data: "opt:0" }],
            [{ text: "Manzil", callback_data: "opt:1" }],
          ],
        },
      });
    });

    it("answers gracefully when the campaign is gone", async () => {
      mockPrisma.automation.findUnique.mockResolvedValue(null);

      await processTelegramUpdate(textUpdate("/start deleted-campaign"));

      expect(sentTexts()).toEqual([BOT_COPY.unknownCampaign]);
      expect(mockPrisma.telegramConversation.upsert).not.toHaveBeenCalled();
    });

    it("answers when the workspace has no flow yet", async () => {
      mockPrisma.automation.findUnique.mockResolvedValue({
        id: "camp1",
        workspaceId: "ws1",
      });
      mockPrisma.telegramFlow.findFirst.mockResolvedValue(null);

      await processTelegramUpdate(textUpdate("/start camp1"));

      expect(sentTexts()).toEqual([BOT_COPY.noFlow]);
    });

    it("answers when the flow exists but has no usable steps", async () => {
      mockPrisma.automation.findUnique.mockResolvedValue({
        id: "camp1",
        workspaceId: "ws1",
      });
      mockPrisma.telegramFlow.findFirst.mockResolvedValue({
        id: "flow1",
        steps: [{ nonsense: true }],
      });

      await processTelegramUpdate(textUpdate("/start camp1"));

      expect(sentTexts()).toEqual([BOT_COPY.emptyFlow]);
    });

    it("falls back when /start carries no payload and there is nothing to resume", async () => {
      await processTelegramUpdate(textUpdate("/start"));

      expect(sentTexts()).toEqual([BOT_COPY.noPayload]);
      expect(mockPrisma.automation.findUnique).not.toHaveBeenCalled();
    });

    it("resumes the last workspace when /start carries no payload", async () => {
      mockPrisma.telegramConversation.findFirst.mockResolvedValue({
        id: "conv1",
        currentStepId: "s2",
        answers: {},
        flow: { steps: FLOW_STEPS },
      });

      await processTelegramUpdate(textUpdate("/start"));

      expect(sentTexts()).toEqual(["Telefon raqamingizni yozing"]);
    });
  });

  describe("replies (T6)", () => {
    beforeEach(() => {
      mockPrisma.telegramConversation.findFirst.mockResolvedValue({
        id: "conv1",
        currentStepId: "s1",
        answers: {},
        flow: { steps: FLOW_STEPS },
      });
    });

    it("advances on a button tap and stores the answer", async () => {
      await processTelegramUpdate(tapUpdate(0));

      expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStepId: "s2",
            answers: { interest: "Narx" },
          }),
        })
      );
      expect(sentTexts()).toEqual(["Telefon raqamingizni yozing"]);
      expect(mockAnswerCallbackQuery).toHaveBeenCalledWith("cbq-1");
    });

    it("accepts an option typed by hand, case and space insensitive", async () => {
      await processTelegramUpdate(textUpdate("  narx "));

      expect(sentTexts()).toEqual(["Telefon raqamingizni yozing"]);
    });

    it("never goes silent on an unrecognised reply, and does not advance", async () => {
      await processTelegramUpdate(textUpdate("nimadir boshqa"));

      // Two messages: we did not understand, then the prompt again.
      expect(sentTexts()).toEqual([
        BOT_COPY.noMatch,
        "Salom Aziz! Nima qiziqtiradi?",
      ]);
      // The step must not move on.
      expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ currentStepId: expect.anything() }),
        })
      );
    });

    it("ends the conversation when an option leads nowhere", async () => {
      await processTelegramUpdate(tapUpdate(1));

      expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStepId: null,
            answers: { interest: "Manzil" },
          }),
        })
      );
      expect(sentTexts()).toEqual([BOT_COPY.finished]);
    });

    it("stores free text on a step with no options", async () => {
      mockPrisma.telegramConversation.findFirst.mockResolvedValue({
        id: "conv1",
        currentStepId: "s2",
        answers: { interest: "Narx" },
        flow: { steps: FLOW_STEPS },
      });

      await processTelegramUpdate(textUpdate("+998901234567"));

      expect(mockPrisma.telegramConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStepId: null,
            answers: { interest: "Narx", phone: "+998901234567" },
          }),
        })
      );
      expect(sentTexts()).toEqual([BOT_COPY.finished]);
    });

    it("answers someone typing at a bot they never started", async () => {
      mockPrisma.telegramConversation.findFirst.mockResolvedValue(null);

      await processTelegramUpdate(textUpdate("salom"));

      expect(sentTexts()).toEqual([BOT_COPY.noPayload]);
    });

    it("answers when the flow was edited out from under a live conversation", async () => {
      mockPrisma.telegramConversation.findFirst.mockResolvedValue({
        id: "conv1",
        currentStepId: "step-that-no-longer-exists",
        answers: {},
        flow: { steps: FLOW_STEPS },
      });

      await processTelegramUpdate(textUpdate("salom"));

      expect(sentTexts()).toEqual([BOT_COPY.finished]);
    });
  });
});
