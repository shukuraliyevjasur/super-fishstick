import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLongLivedToken,
  getUserInfo,
  refreshLongLivedToken,
} from "@/lib/meta/client";

/**
 * Instagram splits its hosts: the OAuth token endpoints sit at the root of
 * graph.instagram.com, while the Graph nodes are versioned. Prefixing the token
 * endpoints with a version broke account linking with a code-100 "Unsupported
 * request" that only appears once a real token is used — a bad token returns
 * 190 either way, so it survived manual curl checks and shipped twice.
 */

let requestedUrls: string[] = [];

function mockJson(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  requestedUrls = [];
  vi.stubEnv("META_GRAPH_API_VERSION", "v25.0");
  vi.stubEnv("INSTAGRAM_APP_SECRET", "test-secret");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return mockJson({ access_token: "t", expires_in: 100, id: "1", username: "u" });
    })
  );
});

describe("Instagram OAuth token endpoints are unversioned", () => {
  it("exchanges a long-lived token at the host root", async () => {
    await getLongLivedToken("short-lived");
    const url = new URL(requestedUrls[0]);

    expect(url.pathname).toBe("/access_token");
    expect(url.pathname).not.toContain("v25.0");
    expect(url.searchParams.get("grant_type")).toBe("ig_exchange_token");
  });

  it("refreshes a long-lived token at the host root", async () => {
    await refreshLongLivedToken("long-lived");
    const url = new URL(requestedUrls[0]);

    expect(url.pathname).toBe("/refresh_access_token");
    expect(url.pathname).not.toContain("v25.0");
    expect(url.searchParams.get("grant_type")).toBe("ig_refresh_token");
  });
});

describe("Instagram Graph nodes stay versioned", () => {
  it("reads the profile from the versioned /me node", async () => {
    await getUserInfo("token");
    const url = new URL(requestedUrls[0]);

    expect(url.pathname).toBe("/v25.0/me");
  });

  it("requests user_id, the id webhooks arrive under", async () => {
    await getUserInfo("token");
    const fields = new URL(requestedUrls[0]).searchParams.get("fields") ?? "";

    // entry.id in a webhook is the professional account id, not the
    // app-scoped `id`; dropping this field silently misroutes comment events.
    expect(fields.split(",")).toContain("user_id");
  });
});
