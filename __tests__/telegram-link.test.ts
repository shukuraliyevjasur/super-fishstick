import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    telegramLinkCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    telegramLink: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

const { createLinkCode, redeemLinkCode, isLinkPayload, LINK_CODE_PREFIX } =
  await import("@/lib/telegram/link");

const FUTURE = new Date(Date.now() + 10 * 60 * 1000);
const PAST = new Date(Date.now() - 1000);

describe("Telegram account linking (D4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.telegramLinkCode.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.telegramLinkCode.create.mockResolvedValue({});
    mockPrisma.telegramLinkCode.delete.mockResolvedValue({});
    mockPrisma.telegramLink.upsert.mockResolvedValue({});
  });

  it("mints a code that fits Telegram's /start payload limit", async () => {
    const code = await createLinkCode("user1");

    // The reason the code is opaque rather than a signed token: prefix plus
    // code must stay under 64 characters, and an HMAC token does not.
    expect(`${LINK_CODE_PREFIX}${code}`.length).toBeLessThanOrEqual(64);
    expect(`${LINK_CODE_PREFIX}${code}`).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("invalidates any previous code when minting a new one", async () => {
    await createLinkCode("user1");

    // Otherwise a code shoulder-surfed from an older screen stays redeemable.
    expect(mockPrisma.telegramLinkCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user1" },
    });
  });

  it("recognises a link payload", () => {
    expect(isLinkPayload("lnk_abc123")).toBe(true);
    expect(isLinkPayload("cmdx9k2p10000v8h4g7q2n1zt")).toBe(false);
  });

  it("binds the account on a valid code", async () => {
    mockPrisma.telegramLinkCode.findUnique.mockResolvedValue({
      code: "abc",
      userId: "user1",
      expiresAt: FUTURE,
    });

    const userId = await redeemLinkCode("lnk_abc", BigInt(555), BigInt(999));

    expect(userId).toBe("user1");
    expect(mockPrisma.telegramLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user1" },
        create: { userId: "user1", telegramUserId: BigInt(555), chatId: BigInt(999) },
      })
    );
  });

  it("consumes the code even when it has expired", async () => {
    mockPrisma.telegramLinkCode.findUnique.mockResolvedValue({
      code: "abc",
      userId: "user1",
      expiresAt: PAST,
    });

    const userId = await redeemLinkCode("lnk_abc", BigInt(555), BigInt(999));

    expect(userId).toBeNull();
    // Deleted regardless, so a leaked payload cannot be replayed against a
    // clock change or a retry.
    expect(mockPrisma.telegramLinkCode.delete).toHaveBeenCalled();
    expect(mockPrisma.telegramLink.upsert).not.toHaveBeenCalled();
  });

  it("rejects an unknown code without binding anything", async () => {
    mockPrisma.telegramLinkCode.findUnique.mockResolvedValue(null);

    expect(await redeemLinkCode("lnk_nope", BigInt(555), BigInt(999))).toBeNull();
    expect(mockPrisma.telegramLink.upsert).not.toHaveBeenCalled();
  });

  it("rejects an empty code", async () => {
    expect(await redeemLinkCode("lnk_", BigInt(555), BigInt(999))).toBeNull();
    expect(mockPrisma.telegramLinkCode.findUnique).not.toHaveBeenCalled();
  });

  // Someone switching Telegram accounts must not keep receiving test sends on
  // the old one.
  it("replaces an existing binding rather than adding a second", async () => {
    mockPrisma.telegramLinkCode.findUnique.mockResolvedValue({
      code: "abc",
      userId: "user1",
      expiresAt: FUTURE,
    });

    await redeemLinkCode("lnk_abc", BigInt(777), BigInt(888));

    const call = mockPrisma.telegramLink.upsert.mock.calls[0][0];
    expect(call.update).toMatchObject({ telegramUserId: BigInt(777), chatId: BigInt(888) });
  });
});
