import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/telegram/client", () => ({
  getWebhookSecretToken: () => "test-secret-token",
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
    vi.spyOn(console, "log").mockImplementation(() => {});
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
});
