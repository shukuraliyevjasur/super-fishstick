import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPrisma,
  mockWorkerHealth,
  mockWorkerAlerts,
  mockSendAlert,
  mockJobCounts,
  mockPing,
} = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    operationalEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
  mockWorkerHealth: vi.fn(),
  mockWorkerAlerts: vi.fn(),
  mockSendAlert: vi.fn(),
  mockJobCounts: vi.fn(),
  mockPing: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ getJobCounts: mockJobCounts }),
  getRedisConnection: () => ({ ping: mockPing }),
}));

vi.mock("@/lib/ops/worker-health", () => ({
  getWorkerHealth: mockWorkerHealth,
  getWorkerAlerts: mockWorkerAlerts,
}));

vi.mock("@/lib/ops/alert-email", () => ({
  sendOperationalAlert: mockSendAlert,
}));

import { GET } from "../app/api/cron/health-check/route";

const CRON_SECRET = "test-cron-secret";

function authorizedRequest() {
  return new Request("https://replie.uz/api/cron/health-check", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  }) as Parameters<typeof GET>[0];
}

/** Everything healthy, nothing failing. */
function healthyState() {
  mockPrisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);
  mockPing.mockResolvedValue("PONG");
  mockJobCounts.mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0 });
  mockWorkerHealth.mockResolvedValue({
    healthy: true,
    heartbeat: { status: "running", worker: "dm", pid: 1, checkedAt: "now" },
    ageMs: 5_000,
  });
  mockWorkerAlerts.mockResolvedValue([]);
  mockPrisma.operationalEvent.findMany.mockResolvedValue([]);
  mockPrisma.operationalEvent.create.mockResolvedValue({});
  mockSendAlert.mockResolvedValue({ sent: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
  healthyState();
});

describe("health-check cron", () => {
  it("returns 200 and sends nothing when everything is healthy", async () => {
    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
    expect(mockSendAlert).not.toHaveBeenCalled();
    expect(mockPrisma.operationalEvent.create).not.toHaveBeenCalled();
  });

  it("returns 503 and emails when the worker heartbeat is gone", async () => {
    // The failure this finding exists for: worker dies, jobs queue in Redis,
    // every customer's comment-to-DM silently stops.
    mockWorkerHealth.mockResolvedValue({
      healthy: false,
      heartbeat: null,
      ageMs: null,
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mockSendAlert).toHaveBeenCalledTimes(1);

    const [subject, lines] = mockSendAlert.mock.calls[0];
    expect(subject).toContain("degraded");
    expect(lines.join("\n")).toContain("No worker heartbeat");
  });

  it("returns 200 but emails when worker is alive but failing sends", async () => {
    const now = new Date().toISOString();
    mockWorkerAlerts.mockResolvedValue([
      { level: "error", message: "Meta API 400", createdAt: now },
      { level: "error", message: "Meta API 400", createdAt: now },
      { level: "error", message: "Decrypt failed", createdAt: now },
    ]);

    const response = await GET(authorizedRequest());

    // System is up (200), but operator gets an email about failing sends.
    expect(response.status).toBe(200);
    expect(mockSendAlert).toHaveBeenCalledTimes(1);

    const [subject, lines] = mockSendAlert.mock.calls[0];
    expect(subject).toContain("worker failing sends");
    expect(lines.join("\n")).toContain("Worker failures");
  });

  it("emails about token refresh failures even while healthy", async () => {
    // C3: refresh failures are recorded and never surfaced. Silent until every
    // connected account drops at the 60-day mark.
    mockPrisma.operationalEvent.findMany.mockResolvedValue([
      {
        message: "Token refresh failed for @ceo.syr: bad request",
        createdAt: new Date("2026-08-03T05:00:00.000Z"),
        workspaceId: "workspace_1",
      },
    ]);

    const response = await GET(authorizedRequest());

    // Still 200 — the system is serving, but someone needs to know.
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      tokenRefreshFailures: 1,
    });

    const [subject, lines] = mockSendAlert.mock.calls[0];
    expect(subject).toContain("token refresh");
    expect(lines.join("\n")).toContain("@ceo.syr");
  });

  it("records an OperationalEvent even when the email fails to send", async () => {
    mockWorkerHealth.mockResolvedValue({
      healthy: false,
      heartbeat: null,
      ageMs: null,
    });
    mockSendAlert.mockResolvedValue({ sent: false, reason: "resend 500" });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mockPrisma.operationalEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: null,
        source: "HEALTH",
        level: "ERROR",
        payload: expect.objectContaining({ alertSent: false }),
      }),
    });
  });

  it("still reports degraded when the database is the thing that is down", async () => {
    // Both the refresh-error query and the event write go to the same database.
    // Neither may take the route down with it.
    mockPrisma.$queryRaw.mockRejectedValue(new Error("EMAXCONNSESSION"));
    mockPrisma.operationalEvent.findMany.mockRejectedValue(new Error("down"));
    mockPrisma.operationalEvent.create.mockRejectedValue(new Error("down"));

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mockSendAlert).toHaveBeenCalledTimes(1);
    expect(mockSendAlert.mock.calls[0][1].join("\n")).toContain("EMAXCONNSESSION");
  });
});
