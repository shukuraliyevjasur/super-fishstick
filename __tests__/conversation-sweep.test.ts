import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    telegramConversation: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

const { sweepStaleConversations, CONVERSATION_TTL_DAYS } = await import(
  "@/lib/telegram/conversation-sweep"
);

/** `count` rows of `{ id }`, as findMany returns them. */
function rows(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({ id: `c${offset + i}` }));
}

describe("Telegram conversation TTL sweep (E9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.telegramConversation.deleteMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve({ count: where.id.in.length })
    );
  });

  it("deletes nothing when no conversation is stale", async () => {
    mockPrisma.telegramConversation.findMany.mockResolvedValue([]);

    const result = await sweepStaleConversations();

    expect(result).toEqual({ deleted: 0, batches: 0, hitCap: false });
    expect(mockPrisma.telegramConversation.deleteMany).not.toHaveBeenCalled();
  });

  it("cuts off at 30 days before now", async () => {
    mockPrisma.telegramConversation.findMany.mockResolvedValue([]);
    const now = new Date("2026-08-08T00:00:00.000Z");

    await sweepStaleConversations(now);

    const where = mockPrisma.telegramConversation.findMany.mock.calls[0][0].where;
    expect(where.lastActiveAt.lt).toEqual(new Date("2026-07-09T00:00:00.000Z"));
    expect(CONVERSATION_TTL_DAYS).toBe(30);
  });

  it("reads the index and deletes by id, never an unbounded deleteMany", async () => {
    mockPrisma.telegramConversation.findMany.mockResolvedValue(rows(3));

    await sweepStaleConversations();

    // The delete is scoped to the ids just selected — not to the cutoff, which
    // would be an unlimited delete on the hottest table.
    expect(mockPrisma.telegramConversation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["c0", "c1", "c2"] } },
    });
    expect(mockPrisma.telegramConversation.findMany.mock.calls[0][0].take).toBe(500);
  });

  it("stops after a short batch rather than asking again", async () => {
    mockPrisma.telegramConversation.findMany.mockResolvedValue(rows(10));

    const result = await sweepStaleConversations();

    expect(result).toEqual({ deleted: 10, batches: 1, hitCap: false });
    expect(mockPrisma.telegramConversation.findMany).toHaveBeenCalledTimes(1);
  });

  it("keeps going while batches come back full", async () => {
    mockPrisma.telegramConversation.findMany
      .mockResolvedValueOnce(rows(500))
      .mockResolvedValueOnce(rows(500, 500))
      .mockResolvedValueOnce(rows(20, 1000));

    const result = await sweepStaleConversations();

    expect(result).toEqual({ deleted: 1020, batches: 3, hitCap: false });
  });

  it("stops at the per-run ceiling and says so", async () => {
    // Always full: more work than one run should take.
    mockPrisma.telegramConversation.findMany.mockResolvedValue(rows(500));

    const result = await sweepStaleConversations();

    expect(result.batches).toBe(20);
    expect(result.deleted).toBe(10_000);
    // The signal that the next run still has work to do.
    expect(result.hitCap).toBe(true);
  });
});
