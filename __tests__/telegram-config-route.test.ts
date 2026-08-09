import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetWorkspaceId, mockGetOwnBotStatus } = vi.hoisted(() => ({
  mockGetWorkspaceId: vi.fn(),
  mockGetOwnBotStatus: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentWorkspaceId: mockGetWorkspaceId }));
vi.mock("@/lib/telegram/own-bot", () => ({ getOwnBotStatus: mockGetOwnBotStatus }));

const { GET } = await import("@/app/api/telegram/config/route");

describe("GET /api/telegram/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetOwnBotStatus.mockResolvedValue({ configured: false, botUsername: null, botId: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWorkspaceId.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns the workspace bot username when configured", async () => {
    mockGetWorkspaceId.mockResolvedValue("ws1");
    mockGetOwnBotStatus.mockResolvedValue({ configured: true, botUsername: "agency_bot", botId: "bot1" });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, botUsername: "agency_bot", isOwnBot: true });
  });

  it("does not fall back to the shared bot", async () => {
    mockGetWorkspaceId.mockResolvedValue("ws1");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "@mybot");

    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({ success: true, botUsername: null, isOwnBot: false });
  });

  it("returns null when the env var is unset", async () => {
    mockGetWorkspaceId.mockResolvedValue("ws1");
    delete process.env.TELEGRAM_BOT_USERNAME;

    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({ success: true, botUsername: null, isOwnBot: false });
  });
});
