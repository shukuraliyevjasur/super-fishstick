import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLongLivedToken,
  getUserInfo,
  refreshLongLivedToken,
} from "@/lib/meta/client";
import { exchangeCodeForToken } from "@/lib/meta/oauth";

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
    status: 200,
    json: async () => body,
    // getLongLivedToken reads the body as text so it can log it verbatim on
    // failure, so the mock has to answer both.
    text: async () => JSON.stringify(body),
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
  // A code-100 "Unsupported request" from these endpoints is not a URL problem:
  // Meta refuses every graph.instagram.com call, including /me, for an account
  // that has not been added to the app under Instagram API setup. Four URL
  // shapes were tried against it before that was understood; none of them was
  // the issue, so the single documented form is all that is kept here.
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

describe("authorization-code exchange response shape", () => {
  function mockExchange(body: unknown) {
    vi.stubEnv("INSTAGRAM_APP_ID", "app-id");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response)
    );
  }

  it("reads the token out of the data array Business Login returns", async () => {
    // The documented shape. Reading access_token off the top level yields
    // undefined, which used to surface two calls later as a code-100 error
    // from the long-lived token exchange.
    mockExchange({
      data: [
        { access_token: "IGAA-short-lived", user_id: 178414, permissions: "x" },
      ],
    });

    const result = await exchangeCodeForToken("code", "https://replie.uz/cb");
    expect(result.accessToken).toBe("IGAA-short-lived");
    expect(result.userId).toBe("178414");
  });

  it("still accepts a flat response", async () => {
    mockExchange({ access_token: "flat-token", user_id: 42 });

    const result = await exchangeCodeForToken("code", "https://replie.uz/cb");
    expect(result.accessToken).toBe("flat-token");
    expect(result.userId).toBe("42");
  });

  it("throws instead of passing undefined downstream", async () => {
    mockExchange({ data: [] });

    await expect(
      exchangeCodeForToken("code", "https://replie.uz/cb")
    ).rejects.toThrow(/no access_token/);
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
