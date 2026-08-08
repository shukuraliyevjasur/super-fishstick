import { describe, it, expect, vi, beforeEach } from "vitest";
import { GrammyError } from "grammy";

vi.mock("@/lib/queue/client", () => ({
  getRedisConnection: vi.fn(),
}));

const { sendMessage } = await import("@/lib/telegram/client");

describe("sendMessage error mapping", () => {
  it("returns ok with messageId on success", async () => {
    const api = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 42 }),
    } as never;
    const result = await sendMessage(api, 123, "hello");
    expect(result).toEqual({ ok: true, messageId: 42 });
  });

  it("maps 403 to BLOCKED", async () => {
    const api = {
      sendMessage: vi.fn().mockRejectedValue(
        new GrammyError("Forbidden", {
          ok: false,
          error_code: 403,
          description: "Forbidden: bot was blocked by the user",
        } as never, "sendMessage", {} as never)
      ),
    } as never;
    const result = await sendMessage(api, 123, "hello");
    expect(result).toEqual({ ok: false, code: "BLOCKED" });
  });

  it("maps 401 to UNAUTHORIZED", async () => {
    const api = {
      sendMessage: vi.fn().mockRejectedValue(
        new GrammyError("Unauthorized", {
          ok: false,
          error_code: 401,
          description: "Unauthorized",
        } as never, "sendMessage", {} as never)
      ),
    } as never;
    const result = await sendMessage(api, 123, "hello");
    expect(result).toEqual({ ok: false, code: "UNAUTHORIZED" });
  });

  it("maps 429 to RATE_LIMITED with retry_after", async () => {
    const api = {
      sendMessage: vi.fn().mockRejectedValue(
        new GrammyError("Too Many Requests", {
          ok: false,
          error_code: 429,
          description: "Too Many Requests: retry after 30",
          parameters: { retry_after: 30 },
        } as never, "sendMessage", {} as never)
      ),
    } as never;
    const result = await sendMessage(api, 123, "hello");
    expect(result).toEqual({ ok: false, code: "RATE_LIMITED", retryAfter: 30 });
  });

  it("maps 400 to BAD_REQUEST", async () => {
    const api = {
      sendMessage: vi.fn().mockRejectedValue(
        new GrammyError("Bad Request", {
          ok: false,
          error_code: 400,
          description: "Bad Request: message text is empty",
        } as never, "sendMessage", {} as never)
      ),
    } as never;
    const result = await sendMessage(api, 123, "hello");
    expect(result).toEqual({ ok: false, code: "BAD_REQUEST" });
  });

  it("maps unknown errors to UNKNOWN", async () => {
    const api = {
      sendMessage: vi.fn().mockRejectedValue(new Error("network error")),
    } as never;
    const result = await sendMessage(api, 123, "hello");
    expect(result).toEqual({ ok: false, code: "UNKNOWN" });
  });
});
