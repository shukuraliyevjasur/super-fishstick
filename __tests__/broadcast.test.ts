import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSendText } = vi.hoisted(() => ({
  mockPrisma: {
    telegramConversation: { findMany: vi.fn(), count: vi.fn() },
    telegramBroadcast: { findUnique: vi.fn(), update: vi.fn() },
    telegramBroadcastRecipient: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
  mockSendText: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/telegram/engine", () => ({ sendText: mockSendText }));

const {
  enrollRecipients,
  sendBroadcastBatch,
  countAudience,
  MAX_BROADCAST_RECIPIENTS,
} = await import("@/lib/telegram/broadcast");

/** `count` conversation rows, as findMany returns them. */
function conversations(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${offset + i}`,
    telegramUserId: BigInt(offset + i),
    chatId: BigInt(offset + i),
  }));
}

function recipients(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    chatId: BigInt(i),
  }));
}

/** Counters read back after a batch: SENT, FAILED+BLOCKED, PENDING. */
function stubCounts(sent: number, failed: number, pending: number) {
  mockPrisma.telegramBroadcastRecipient.count
    .mockResolvedValueOnce(sent)
    .mockResolvedValueOnce(failed)
    .mockResolvedValueOnce(pending);
}

describe("broadcast enrollment (E8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.telegramBroadcastRecipient.createMany.mockResolvedValue({ count: 0 });
  });

  it("counts the audience, filtered by flow when one is given", async () => {
    mockPrisma.telegramConversation.count.mockResolvedValue(7);

    expect(await countAudience("ws1", "flow1")).toBe(7);
    expect(mockPrisma.telegramConversation.count).toHaveBeenCalledWith({
      where: { workspaceId: "ws1", flowId: "flow1" },
    });

    await countAudience("ws1", null);
    expect(mockPrisma.telegramConversation.count).toHaveBeenLastCalledWith({
      where: { workspaceId: "ws1" },
    });
  });

  it("pages with a cursor rather than loading the audience at once", async () => {
    mockPrisma.telegramConversation.findMany
      .mockResolvedValueOnce(conversations(500))
      .mockResolvedValueOnce(conversations(10, 500));

    const enrolled = await enrollRecipients("b1", "ws1", null);

    expect(enrolled).toBe(510);
    // Second page continues after the last id of the first, not by offset.
    const second = mockPrisma.telegramConversation.findMany.mock.calls[1][0];
    expect(second.cursor).toEqual({ id: "c499" });
    expect(second.skip).toBe(1);
  });

  it("skips duplicates so a re-run cannot enroll anyone twice", async () => {
    mockPrisma.telegramConversation.findMany.mockResolvedValueOnce(conversations(3));

    await enrollRecipients("b1", "ws1", null);

    expect(mockPrisma.telegramBroadcastRecipient.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
  });

  it("stops at the per-workspace cap", async () => {
    // Always a full page: an audience larger than the ceiling.
    mockPrisma.telegramConversation.findMany.mockResolvedValue(conversations(500));

    const enrolled = await enrollRecipients("b1", "ws1", null);

    expect(enrolled).toBe(MAX_BROADCAST_RECIPIENTS);
  });

  it("enrolls nothing for an empty audience", async () => {
    mockPrisma.telegramConversation.findMany.mockResolvedValue([]);

    expect(await enrollRecipients("b1", "ws1", null)).toBe(0);
    expect(mockPrisma.telegramBroadcastRecipient.createMany).not.toHaveBeenCalled();
  });
});

describe("broadcast sending (T8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.telegramBroadcast.findUnique.mockResolvedValue({ message: "Salom!" });
    mockPrisma.telegramBroadcast.update.mockResolvedValue({});
    mockPrisma.telegramBroadcastRecipient.update.mockResolvedValue({});
  });

  it("marks each recipient as it goes, not in one update at the end", async () => {
    mockPrisma.telegramBroadcastRecipient.findMany.mockResolvedValue(recipients(3));
    mockSendText.mockResolvedValue({ ok: true, messageId: 1 });
    stubCounts(3, 0, 0);

    const result = await sendBroadcastBatch("b1");

    expect(result).toMatchObject({ sent: 3, failed: 0, remaining: 0 });
    // Three separate updates: a crash between sends loses one message, not the
    // record of the whole batch.
    expect(mockPrisma.telegramBroadcastRecipient.update).toHaveBeenCalledTimes(3);
  });

  it("completes the broadcast when nothing is left pending", async () => {
    mockPrisma.telegramBroadcastRecipient.findMany.mockResolvedValue(recipients(1));
    mockSendText.mockResolvedValue({ ok: true, messageId: 1 });
    stubCounts(1, 0, 0);

    await sendBroadcastBatch("b1");

    expect(mockPrisma.telegramBroadcast.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
  });

  it("does not complete while recipients remain", async () => {
    mockPrisma.telegramBroadcastRecipient.findMany.mockResolvedValue(recipients(2));
    mockSendText.mockResolvedValue({ ok: true, messageId: 1 });
    stubCounts(2, 0, 40);

    const result = await sendBroadcastBatch("b1");

    expect(result.remaining).toBe(40);
    expect(mockPrisma.telegramBroadcast.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ status: "COMPLETED" }),
      })
    );
  });

  it("records a blocked user separately from a failure", async () => {
    mockPrisma.telegramBroadcastRecipient.findMany.mockResolvedValue(recipients(1));
    mockSendText.mockResolvedValue({ ok: false, code: "BLOCKED" });
    stubCounts(0, 1, 0);

    await sendBroadcastBatch("b1");

    // Blocking the bot is not a fault to chase; mixing it into failures makes
    // the failure count meaningless.
    expect(mockPrisma.telegramBroadcastRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "BLOCKED", error: "BLOCKED" }),
      })
    );
  });

  it("stops on Telegram's back-off and leaves the rest pending", async () => {
    mockPrisma.telegramBroadcastRecipient.findMany.mockResolvedValue(recipients(5));
    mockSendText
      .mockResolvedValueOnce({ ok: true, messageId: 1 })
      .mockResolvedValueOnce({ ok: false, code: "RATE_LIMITED", retryAfter: 7 });
    stubCounts(1, 0, 4);

    const result = await sendBroadcastBatch("b1");

    expect(result.sent).toBe(1);
    expect(result.retryAfterMs).toBe(7000);
    // The rate-limited person is not marked failed — they were never properly
    // tried, and the resumed run must pick them up.
    expect(mockSendText).toHaveBeenCalledTimes(2);
    expect(mockPrisma.telegramBroadcastRecipient.update).toHaveBeenCalledTimes(1);
  });

  it("stops when our own limiter refuses a slot", async () => {
    mockPrisma.telegramBroadcastRecipient.findMany.mockResolvedValue(recipients(5));
    mockSendText.mockRejectedValue(new Error("Telegram rate limit reached"));
    stubCounts(0, 0, 5);

    const result = await sendBroadcastBatch("b1");

    expect(result.sent).toBe(0);
    expect(result.retryAfterMs).toBe(1000);
    expect(mockSendText).toHaveBeenCalledTimes(1);
  });

  it("is a no-op for a broadcast that no longer exists", async () => {
    mockPrisma.telegramBroadcast.findUnique.mockResolvedValue(null);

    expect(await sendBroadcastBatch("gone")).toEqual({
      sent: 0,
      failed: 0,
      remaining: 0,
    });
    expect(mockSendText).not.toHaveBeenCalled();
  });
});
