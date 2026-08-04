import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockIsPlatformAdmin, mockGrant, WorkspaceNotFoundError } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockIsPlatformAdmin: vi.fn(),
    mockGrant: vi.fn(),
    // Declared here, not at module scope: vi.mock factories are hoisted above
    // ordinary declarations and would reference it before initialisation.
    WorkspaceNotFoundError: class extends Error {},
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/auth/admin", () => ({
  isCurrentUserPlatformAdmin: mockIsPlatformAdmin,
}));

vi.mock("@/lib/billing/grant", () => ({
  grantWorkspacePlan: mockGrant,
  WorkspaceNotFoundError,
}));

import { POST } from "../app/api/admin/plan/route";

function request(body: unknown) {
  return new Request("https://replie.uz/api/admin/plan", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

const VALID = { workspaceId: "ws_1", plan: "PRO" };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user_admin" } });
  mockIsPlatformAdmin.mockResolvedValue(true);
  mockGrant.mockResolvedValue({
    workspaceId: "ws_1",
    previousPlan: "FREE",
    plan: "PRO",
    planExpiresAt: null,
  });
});

describe("POST /api/admin/plan (P1)", () => {
  it("401s when signed out", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await POST(request(VALID));
    expect(response.status).toBe(401);
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it("403s a signed-in non-admin", async () => {
    // The case that matters: every customer is OWNER of their own workspace, so
    // gating on canManageWorkspace would let anyone grant themselves Pro.
    mockIsPlatformAdmin.mockResolvedValue(false);

    const response = await POST(request(VALID));

    expect(response.status).toBe(403);
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it("grants the plan and attributes it to the caller", async () => {
    const response = await POST(request({ ...VALID, reason: "ref 4471" }));

    expect(response.status).toBe(200);
    expect(mockGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        plan: "PRO",
        grantedBy: "user_admin",
        source: "ADMIN",
        reason: "ref 4471",
      })
    );
  });

  it("rejects an unknown plan value", async () => {
    const response = await POST(
      request({ workspaceId: "ws_1", plan: "ENTERPRISE" })
    );
    expect(response.status).toBe(400);
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it("rejects an expiry in the past, which is almost certainly a typo", async () => {
    const response = await POST(
      request({ ...VALID, expiresAt: "2020-01-01T00:00:00.000Z" })
    );
    expect(response.status).toBe(400);
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it("passes a future expiry through as a Date", async () => {
    await POST(request({ ...VALID, expiresAt: "2027-01-01T00:00:00.000Z" }));

    expect(mockGrant.mock.calls[0][0].expiresAt).toEqual(
      new Date("2027-01-01T00:00:00.000Z")
    );
  });

  it("404s for a workspace that does not exist", async () => {
    mockGrant.mockRejectedValue(new WorkspaceNotFoundError("nope"));
    const response = await POST(request(VALID));
    expect(response.status).toBe(404);
  });

  it("400s on a malformed body rather than throwing", async () => {
    const bad = new Request("https://replie.uz/api/admin/plan", {
      method: "POST",
      body: "not json",
    }) as Parameters<typeof POST>[0];

    const response = await POST(bad);

    expect(response.status).toBe(400);
  });
});
