import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockGetContext, mockAuth, mockCountAudience, mockEnroll, mockQueueAdd } =
  vi.hoisted(() => ({
    mockPrisma: {
      telegramBroadcast: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      telegramBroadcastRecipient: { deleteMany: vi.fn() },
      telegramFlow: { findFirst: vi.fn() },
    },
    mockGetContext: vi.fn(),
    mockAuth: vi.fn(),
    mockCountAudience: vi.fn(),
    mockEnroll: vi.fn(),
    mockQueueAdd: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: mockGetContext,
  canManageWorkspace: (role: string) => role === "OWNER" || role === "ADMIN",
}));
vi.mock("@/lib/telegram/broadcast", () => ({
  countAudience: mockCountAudience,
  enrollRecipients: mockEnroll,
  MAX_BROADCAST_RECIPIENTS: 10000,
}));
vi.mock("@/lib/queue/client", () => ({
  getTelegramQueue: () => ({ add: mockQueueAdd }),
  BROADCAST_JOB_NAME: "process-broadcast",
}));

const { GET, POST: CREATE } = await import("@/app/api/broadcasts/route");
const { POST: SEND, CONFIRMATION_WORD } = await import(
  "@/app/api/broadcasts/[id]/send/route"
);

function jsonRequest(body: unknown, url = "http://localhost/api/broadcasts") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const sendParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/broadcasts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetContext.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the workspace's broadcasts", async () => {
    mockGetContext.mockResolvedValue({ workspaceId: "ws1", role: "OWNER" });
    mockPrisma.telegramBroadcast.findMany.mockResolvedValue([
      { id: "b1", message: "Salom", status: "DRAFT" },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.broadcasts).toHaveLength(1);
  });
});

describe("POST /api/broadcasts (compose)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetContext.mockResolvedValue({ workspaceId: "ws1", role: "OWNER" });
    mockCountAudience.mockResolvedValue(50);
    mockPrisma.telegramBroadcast.create.mockResolvedValue({
      id: "b1",
      message: "Salom!",
      status: "DRAFT",
      totalRecipients: 50,
    });
  });

  it("creates a DRAFT broadcast and reports audience size", async () => {
    const res = await CREATE(jsonRequest({ message: "Salom!" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.broadcast.status).toBe("DRAFT");
    expect(body.audience).toBe(50);
  });

  it("rejects an empty message", async () => {
    const res = await CREATE(jsonRequest({ message: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects a message over 4000 characters", async () => {
    const res = await CREATE(jsonRequest({ message: "x".repeat(4001) }));
    expect(res.status).toBe(400);
  });

  it("rejects a non-OWNER role", async () => {
    mockGetContext.mockResolvedValue({ workspaceId: "ws1", role: "MEMBER" });
    const res = await CREATE(jsonRequest({ message: "hi" }));
    expect(res.status).toBe(403);
  });

  it("refuses when audience exceeds the cap (E8)", async () => {
    mockCountAudience.mockResolvedValue(10001);
    const res = await CREATE(jsonRequest({ message: "hi" }));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("Audience too large");
  });
});

describe("POST /api/broadcasts/:id/send (confirm)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContext.mockResolvedValue({ workspaceId: "ws1", role: "OWNER" });
    mockPrisma.telegramBroadcast.findFirst.mockResolvedValue({
      id: "b1",
      status: "DRAFT",
      flowId: null,
    });
    mockEnroll.mockResolvedValue(50);
    mockPrisma.telegramBroadcast.update.mockResolvedValue({});
    mockQueueAdd.mockResolvedValue({ id: "job-1" });
  });

  it("sends when the confirmation word matches", async () => {
    const res = await SEND(
      jsonRequest({ confirm: CONFIRMATION_WORD, expectedRecipients: 50 }),
      sendParams("b1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.recipients).toBe(50);
    expect(mockQueueAdd).toHaveBeenCalledWith("process-broadcast", {
      broadcastId: "b1",
    });
  });

  it("rejects a wrong confirmation word", async () => {
    const res = await SEND(
      jsonRequest({ confirm: "yes" }),
      sendParams("b1")
    );
    expect(res.status).toBe(400);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("is a no-op when the broadcast is already sending", async () => {
    mockPrisma.telegramBroadcast.findFirst.mockResolvedValue({
      id: "b1",
      status: "SENDING",
    });

    const res = await SEND(
      jsonRequest({ confirm: CONFIRMATION_WORD }),
      sendParams("b1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alreadyStarted).toBe(true);
    expect(mockEnroll).not.toHaveBeenCalled();
  });

  it("aborts when the audience changed since preview (409)", async () => {
    mockEnroll.mockResolvedValue(55);
    mockPrisma.telegramBroadcastRecipient.deleteMany.mockResolvedValue({
      count: 55,
    });

    const res = await SEND(
      jsonRequest({ confirm: CONFIRMATION_WORD, expectedRecipients: 50 }),
      sendParams("b1")
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Audience changed since the preview");
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("returns 404 for a broadcast in another workspace", async () => {
    mockPrisma.telegramBroadcast.findFirst.mockResolvedValue(null);

    const res = await SEND(
      jsonRequest({ confirm: CONFIRMATION_WORD }),
      sendParams("other")
    );
    expect(res.status).toBe(404);
  });

  it("refuses when no recipients would receive the message", async () => {
    mockEnroll.mockResolvedValue(0);

    const res = await SEND(
      jsonRequest({ confirm: CONFIRMATION_WORD }),
      sendParams("b1")
    );
    expect(res.status).toBe(422);
  });
});
