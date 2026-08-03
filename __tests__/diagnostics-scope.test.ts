import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPrisma,
  mockWorkspaceId,
  mockIsPlatformAdmin,
  mockJobCounts,
  mockWorkerAlerts,
} = vi.hoisted(() => ({
  mockPrisma: {
    webhookEvent: { findMany: vi.fn() },
    dmLog: { findMany: vi.fn() },
    operationalEvent: { findMany: vi.fn() },
  },
  mockWorkspaceId: vi.fn(),
  mockIsPlatformAdmin: vi.fn(),
  mockJobCounts: vi.fn(),
  mockWorkerAlerts: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ getCurrentWorkspaceId: mockWorkspaceId }));
vi.mock("@/lib/auth/admin", () => ({
  isCurrentUserPlatformAdmin: mockIsPlatformAdmin,
}));
vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ getJobCounts: mockJobCounts }),
}));
vi.mock("@/lib/ops/worker-health", () => ({
  getWorkerAlerts: mockWorkerAlerts,
  getWorkerHealth: vi.fn().mockResolvedValue({
    healthy: true,
    ageMs: 4_000,
    heartbeat: { pid: 42, hostname: "replie-vm", checkedAt: "now" },
  }),
}));

import { GET } from "../app/api/admin/diagnostics/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockWorkspaceId.mockResolvedValue("workspace_1");
  mockPrisma.webhookEvent.findMany.mockResolvedValue([]);
  mockPrisma.dmLog.findMany.mockResolvedValue([]);
  mockPrisma.operationalEvent.findMany.mockResolvedValue([]);
  mockJobCounts.mockResolvedValue({ waiting: 3 });
  mockWorkerAlerts.mockResolvedValue([{ level: "error", message: "x" }]);
});

/** The system-wide events query is the last operationalEvent.findMany call. */
function systemEventsWhere() {
  const calls = mockPrisma.operationalEvent.findMany.mock.calls;
  return calls[calls.length - 1][0].where;
}

describe("diagnostics route — cross-tenant scoping (S2)", () => {
  it("401s when signed out", async () => {
    mockWorkspaceId.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("withholds global data from an ordinary user", async () => {
    mockIsPlatformAdmin.mockResolvedValue(false);

    const response = await GET();
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.isPlatformAdmin).toBe(false);
    // Global queue depth and worker alerts belong to no single tenant, and
    // alerts carry other workspaces' job and comment ids.
    expect(data.queueCounts).toBeNull();
    expect(data.workerAlerts).toBeNull();
    expect(mockJobCounts).not.toHaveBeenCalled();
    expect(mockWorkerAlerts).not.toHaveBeenCalled();
    // Liveness is legitimate; worker internals are not.
    expect(data.workerHealth).toEqual({
      healthy: true,
      ageMs: null,
      heartbeat: null,
    });
    // System-wide events (workspaceId: null) must not be included.
    expect(systemEventsWhere()).toEqual({ workspaceId: "workspace_1" });
  });

  it("gives a platform admin the global data", async () => {
    mockIsPlatformAdmin.mockResolvedValue(true);

    const response = await GET();
    const { data } = await response.json();

    expect(data.isPlatformAdmin).toBe(true);
    expect(data.queueCounts).toEqual({ waiting: 3 });
    expect(data.workerAlerts).toHaveLength(1);
    expect(data.workerHealth.heartbeat).not.toBeNull();
    expect(systemEventsWhere()).toEqual({
      OR: [{ workspaceId: "workspace_1" }, { workspaceId: null }],
    });
  });

  it("never selects payload on the system-wide event query", async () => {
    // Webhook body previews live in `payload`. Widening this select is what
    // would turn a scoping bug into a body leak.
    mockIsPlatformAdmin.mockResolvedValue(true);
    await GET();

    const calls = mockPrisma.operationalEvent.findMany.mock.calls;
    const select = calls[calls.length - 1][0].select;
    expect(select.payload).toBeUndefined();
  });
});
