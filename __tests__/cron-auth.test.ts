import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    workspace: {
      updateMany: vi.fn(),
    },
    instagramAccount: {
      findMany: vi.fn(),
    },
    automation: {
      findMany: vi.fn(),
    },
    operationalEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/meta/client", () => ({
  refreshLongLivedToken: vi.fn(),
  getUserMedia: vi.fn(),
}));

vi.mock("@/lib/meta/oauth", () => ({
  decryptToken: vi.fn(),
  encryptToken: vi.fn(),
}));

vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ getJobCounts: vi.fn().mockResolvedValue({}) }),
  getRedisConnection: () => ({ ping: vi.fn().mockResolvedValue("PONG") }),
}));

vi.mock("@/lib/ops/worker-health", () => ({
  getWorkerHealth: vi.fn().mockResolvedValue({
    healthy: true,
    heartbeat: null,
    ageMs: 0,
  }),
  getWorkerAlerts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/ops/alert-email", () => ({
  sendOperationalAlert: vi.fn().mockResolvedValue({ sent: true }),
}));

import { GET as refreshTokens } from "../app/api/cron/refresh-tokens/route";
import { GET as attachNextReel } from "../app/api/cron/attach-next-reel/route";
import { GET as health } from "../app/api/health/route";
import { GET as healthCheck } from "../app/api/cron/health-check/route";

const routes = [
  { name: "refresh-tokens", handler: refreshTokens },
  { name: "attach-next-reel", handler: attachNextReel },
  // S4: /api/health used to skip the check entirely when CRON_SECRET was unset,
  // exposing raw database and Redis error strings. It is now unconditional.
  { name: "health", handler: health },
  { name: "health-check", handler: healthCheck },
];

function requestWith(authorization?: string) {
  return new Request("https://replie.uz/api/cron/x", {
    headers: authorization ? { authorization } : {},
  }) as Parameters<typeof refreshTokens>[0];
}

const originalCronSecret = process.env.CRON_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.workspace.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.instagramAccount.findMany.mockResolvedValue([]);
  mockPrisma.automation.findMany.mockResolvedValue([]);
  mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  mockPrisma.operationalEvent.findMany.mockResolvedValue([]);
});

afterEach(() => {
  process.env.CRON_SECRET = originalCronSecret;
  process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
});

describe.each(routes)("cron auth — $name", ({ handler }) => {
  it("rejects the JWT signing key when CRON_SECRET is unset", async () => {
    // NEXTAUTH_SECRET signs every session cookie. It must never be usable as a
    // cron credential, or leaking it from a cron header forges any user's session.
    delete process.env.CRON_SECRET;
    process.env.NEXTAUTH_SECRET = "jwt-signing-key";

    const response = await handler(requestWith("Bearer jwt-signing-key"));

    expect(response.status).toBe(401);
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    process.env.NEXTAUTH_SECRET = "jwt-signing-key";

    // `Bearer undefined` is what a naive template literal would compare against.
    for (const header of [undefined, "Bearer undefined", "Bearer "]) {
      const response = await handler(requestWith(header));
      expect(response.status).toBe(401);
    }
  });

  it("rejects a wrong secret", async () => {
    process.env.CRON_SECRET = "correct-cron-secret";

    const response = await handler(requestWith("Bearer wrong-secret"));

    expect(response.status).toBe(401);
  });

  it("accepts the configured CRON_SECRET", async () => {
    process.env.CRON_SECRET = "correct-cron-secret";

    const response = await handler(requestWith("Bearer correct-cron-secret"));

    expect(response.status).toBe(200);
  });
});
