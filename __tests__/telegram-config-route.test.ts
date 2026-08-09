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
    // Default: no own bot configured, so the shared env var is used.
    mockGetOwnBotStatus.mockResolvedValue({ configured: false, botUsername: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWorkspaceId.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns the bot username from the env var", async () => {
    mockGetWorkspaceId.mockResolvedValue("ws1");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "@replie_bot");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, botUsername: "replie_bot", isOwnBot: false });
  });

  it("strips the leading @ from the username", async () => {
    mockGetWorkspaceId.mockResolvedValue("ws1");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "@mybot");

    const res = await GET();
    const body = await res.json();

    expect(body.botUsername).toBe("mybot");
  });

  it("returns null when the env var is unset", async () => {
    mockGetWorkspaceId.mockResolvedValue("ws1");
    delete process.env.TELEGRAM_BOT_USERNAME;

    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({ success: true, botUsername: null, isOwnBot: false });
  });
});
