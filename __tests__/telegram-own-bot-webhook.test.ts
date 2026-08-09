import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetWebhookBotId, mockQueueAdd } = vi.hoisted(() => ({
  mockGetWebhookBotId: vi.fn(),
  mockQueueAdd: vi.fn(),
}));

vi.mock("@/lib/telegram/own-bot", () => ({
  getOwnBotWebhookBotId: mockGetWebhookBotId,
}));
vi.mock("@/lib/queue/client", () => ({
  getTelegramQueue: () => ({ add: mockQueueAdd }),
  TELEGRAM_UPDATE_JOB_NAME: "process-telegram-update",
}));

const { POST } = await import("@/app/api/telegram/webhook/own/[workspaceId]/[secret]/route");

const params = { params: Promise.resolve({ workspaceId: "ws1", secret: "path-secret" }) };

function request(body: unknown, header = "header-secret") {
  return new Request("http://localhost/api/telegram/webhook/own/ws1/path-secret", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": header,
    },
    body: JSON.stringify(body),
  }) as never;
}

describe("own Telegram bot webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWebhookBotId.mockResolvedValue("bot1");
    mockQueueAdd.mockResolvedValue({ id: "job1" });
  });

  it("rejects a spoofed route or header before reading the update", async () => {
    mockGetWebhookBotId.mockResolvedValue(null);

    const response = await POST(request({ update_id: 1 }), params);

    expect(response.status).toBe(401);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("enqueues the workspace identity with an authenticated update", async () => {
    const update = { update_id: 1, message: { text: "/start camp1" } };

    const response = await POST(request(update), params);

    expect(response.status).toBe(200);
    expect(mockGetWebhookBotId).toHaveBeenCalledWith("ws1", "path-secret", "header-secret");
    expect(mockQueueAdd).toHaveBeenCalledWith("process-telegram-update", {
      update,
      workspaceId: "ws1",
      botId: "bot1",
    });
  });
});
