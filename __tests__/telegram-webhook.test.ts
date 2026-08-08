import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQueueAdd } = vi.hoisted(() => ({ mockQueueAdd: vi.fn() }));

vi.mock("@/lib/telegram/client", () => ({
  getWebhookSecretToken: () => "test-secret-token",
}));

vi.mock("@/lib/queue/client", () => ({
  getTelegramQueue: () => ({ add: mockQueueAdd }),
  TELEGRAM_UPDATE_JOB_NAME: "process-telegram-update",
}));

const { POST } = await import("@/app/api/telegram/webhook/route");

function makeRequest(
  body: unknown,
  secretHeader?: string | null
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (secretHeader !== null && secretHeader !== undefined) {
    headers.set("x-telegram-bot-api-secret-token", secretHeader);
  }
  return new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as unknown as Request;
}

describe("Telegram webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockQueueAdd.mockResolvedValue({ id: "job-1" });
  });

  it("rejects requests without secret token", async () => {
    const res = await POST(makeRequest({ update_id: 1 }, null) as never);
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong secret token", async () => {
    const res = await POST(makeRequest({ update_id: 1 }, "wrong") as never);
    expect(res.status).toBe(401);
  });

  it("accepts valid requests and returns 200", async () => {
    const res = await POST(
      makeRequest({ update_id: 1, message: { text: "/start" } }, "test-secret-token") as never
    );
    expect(res.status).toBe(200);
  });

  it("enqueues the update rather than processing it inline", async () => {
    const update = { update_id: 7, message: { text: "/start camp1" } };

    await POST(makeRequest(update, "test-secret-token") as never);

    expect(mockQueueAdd).toHaveBeenCalledWith("process-telegram-update", { update });
  });

  it("still returns 200 when the queue is unreachable", async () => {
    // A 500 makes Telegram redeliver on a schedule we do not control, which
    // turns one Redis blip into a retry storm. Drop the update instead.
    mockQueueAdd.mockRejectedValue(new Error("redis down"));

    const res = await POST(
      makeRequest({ update_id: 8, message: { text: "salom" } }, "test-secret-token") as never
    );

    expect(res.status).toBe(200);
  });

  it("rejects a body that is not JSON", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": "test-secret-token",
    });
    const request = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers,
      body: "not json",
    });

    const res = await POST(request as never);

    expect(res.status).toBe(400);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});
