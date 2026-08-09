import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockGetLink, mockCreateCode } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetLink: vi.fn(),
  mockCreateCode: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/telegram/link", () => ({
  getLinkForUser: mockGetLink,
  createLinkCode: mockCreateCode,
  LINK_CODE_PREFIX: "lnk_",
}));

const { GET, POST } = await import("@/app/api/telegram/link/route");

describe("GET /api/telegram/link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns linked:false when no link exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetLink.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, linked: false, linkedAt: null });
  });

  it("returns linked:true with the linkedAt date", async () => {
    const linkedAt = new Date("2026-08-08T10:00:00Z");
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetLink.mockResolvedValue({ linkedAt });

    const res = await GET();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.linked).toBe(true);
    expect(body.linkedAt).toBe(linkedAt.toISOString());
  });
});

describe("POST /api/telegram/link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 503 when no bot is configured", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCreateCode.mockResolvedValue("abc123");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "");

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("Telegram bot is not configured");
  });

  it("returns the deep link URL on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCreateCode.mockResolvedValue("abc123");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "replie_bot");

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.url).toBe("https://t.me/replie_bot?start=lnk_abc123");
  });
});
