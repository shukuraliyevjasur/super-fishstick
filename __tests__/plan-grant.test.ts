import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEffectivePlan } from "../lib/billing/plan";

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    workspace: { findUnique: vi.fn(), update: vi.fn() },
    operationalEvent: { create: vi.fn() },
  };
  return {
    mockTx: tx,
    mockPrisma: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      workspace: { findMany: vi.fn() },
    },
  };
});

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

import {
  WorkspaceNotFoundError,
  downgradeExpiredWorkspaces,
  grantWorkspacePlan,
} from "../lib/billing/grant";

beforeEach(() => {
  vi.clearAllMocks();
  mockTx.workspace.findUnique.mockResolvedValue({
    id: "ws_1",
    plan: "FREE",
  });
  mockTx.workspace.update.mockResolvedValue({
    plan: "PRO",
    planExpiresAt: null,
  });
  mockTx.operationalEvent.create.mockResolvedValue({});
  mockPrisma.workspace.findMany.mockResolvedValue([]);
});

describe("grantWorkspacePlan (P1)", () => {
  it("writes the plan and its audit fields together", async () => {
    const result = await grantWorkspacePlan({
      workspaceId: "ws_1",
      plan: "PRO",
      grantedBy: "user_admin",
    });

    expect(mockTx.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws_1" },
        data: expect.objectContaining({
          plan: "PRO",
          planGrantedBy: "user_admin",
          planExpiresAt: null,
        }),
      })
    );
    expect(result.previousPlan).toBe("FREE");
    expect(result.plan).toBe("PRO");
  });

  it("records an audit event in the same transaction as the write", async () => {
    // D2: manual billing without a trail becomes unrecoverable quickly. The
    // plan columns only hold the latest grant; this event log is the history.
    await grantWorkspacePlan({
      workspaceId: "ws_1",
      plan: "PRO",
      grantedBy: "user_admin",
      reason: "paid via Telegram, ref 4471",
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const event = mockTx.operationalEvent.create.mock.calls[0][0];
    expect(event.data).toMatchObject({
      workspaceId: "ws_1",
      payload: expect.objectContaining({
        kind: "plan_grant",
        source: "ADMIN",
        previousPlan: "FREE",
        plan: "PRO",
        grantedBy: "user_admin",
        reason: "paid via Telegram, ref 4471",
      }),
    });
  });

  it("labels a webhook grant distinctly, so the trail shows how it happened", async () => {
    // The payment webhook calls this same function; only `source` differs.
    await grantWorkspacePlan({
      workspaceId: "ws_1",
      plan: "STANDART",
      grantedBy: "webhook:click",
      source: "PAYMENT_WEBHOOK",
    });

    expect(
      mockTx.operationalEvent.create.mock.calls[0][0].data.payload.source
    ).toBe("PAYMENT_WEBHOOK");
  });

  it("throws rather than silently creating nothing for an unknown workspace", async () => {
    mockTx.workspace.findUnique.mockResolvedValue(null);

    await expect(
      grantWorkspacePlan({
        workspaceId: "missing",
        plan: "PRO",
        grantedBy: "user_admin",
      })
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(mockTx.workspace.update).not.toHaveBeenCalled();
  });
});

describe("getEffectivePlan (P4)", () => {
  const future = new Date("2026-12-01T00:00:00Z");
  const past = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-08-04T00:00:00Z");

  it("keeps a paid plan that has not expired", () => {
    expect(getEffectivePlan({ plan: "PRO", planExpiresAt: future }, now)).toBe(
      "PRO"
    );
  });

  it("treats a null expiry as never expiring", () => {
    expect(getEffectivePlan({ plan: "PRO", planExpiresAt: null }, now)).toBe(
      "PRO"
    );
    expect(getEffectivePlan({ plan: "STANDART" }, now)).toBe("STANDART");
  });

  it("downgrades an expired plan to FREE immediately", () => {
    // Enforcement cannot wait for the sweep: Vercel's free tier runs crons once
    // a day, so a plan lapsing just after a run would otherwise keep paid
    // features for another 24 hours.
    expect(getEffectivePlan({ plan: "PRO", planExpiresAt: past }, now)).toBe(
      "FREE"
    );
  });

  it("treats the exact expiry instant as expired", () => {
    expect(getEffectivePlan({ plan: "PRO", planExpiresAt: now }, now)).toBe(
      "FREE"
    );
  });
});

describe("downgradeExpiredWorkspaces (P4)", () => {
  it("only looks at paid workspaces that are actually past their expiry", async () => {
    await downgradeExpiredWorkspaces(new Date("2026-08-04T00:00:00Z"));

    expect(mockPrisma.workspace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          plan: { not: "FREE" },
          planExpiresAt: { not: null, lte: new Date("2026-08-04T00:00:00Z") },
        },
      })
    );
  });

  it("downgrades through the same audited path, not a raw update", async () => {
    mockPrisma.workspace.findMany.mockResolvedValue([
      { id: "ws_1", plan: "PRO", planExpiresAt: new Date("2026-08-01") },
    ]);
    mockTx.workspace.update.mockResolvedValue({
      plan: "FREE",
      planExpiresAt: null,
    });

    const result = await downgradeExpiredWorkspaces();

    expect(result.downgraded).toBe(1);
    const event = mockTx.operationalEvent.create.mock.calls[0][0];
    expect(event.data.payload).toMatchObject({
      kind: "plan_grant",
      plan: "FREE",
      grantedBy: "system:expiry",
    });
  });
});
