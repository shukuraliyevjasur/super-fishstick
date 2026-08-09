import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockGetLink, mockCreateCode, mockGetContext, mockGetOwnBotStatus } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetLink: vi.fn(),
  mockCreateCode: vi.fn(),
  mockGetContext: vi.fn(),
  mockGetOwnBotStatus: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/telegram/link", () => ({
  getLinkForUser: mockGetLink,
  createLinkCode: mockCreateCode,
  LINK_CODE_PREFIX: "lnk_",
}));
vi.mock("@/lib/workspace-access", () => ({ getCurrentWorkspaceContext: mockGetContext }));
vi.mock("@/lib/telegram/own-bot", () => ({ getOwnBotStatus: mockGetOwnBotStatus }));

const { GET, POST } = await import("@/app/api/telegram/link/route");

describe("GET /api/telegram/link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetContext.mockResolvedValue({ workspaceId: "ws1" });
    mockGetOwnBotStatus.mockResolvedValue({ configured: true, botUsername: "agency_bot", botId: "bot1" });
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
    mockGetContext.mockResolvedValue({ workspaceId: "ws1" });
    mockGetOwnBotStatus.mockResolvedValue({ configured: true, botUsername: "agency_bot", botId: "bot1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("requires an own bot", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetOwnBotStatus.mockResolvedValue({ configured: false, botUsername: null, botId: null });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Own Telegram bot is not configured");
  });

  it("returns the deep link URL on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCreateCode.mockResolvedValue("abc123");

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.url).toBe("https://t.me/agency_bot?start=lnk_abc123");
  });
});
