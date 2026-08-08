import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockGetWorkspaceId, mockGetContext } = vi.hoisted(() => ({
  mockPrisma: {
    telegramFlow: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  mockGetWorkspaceId: vi.fn(),
  mockGetContext: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ getCurrentWorkspaceId: mockGetWorkspaceId }));
vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: mockGetContext,
  canManageWorkspace: (role: string) => role === "OWNER" || role === "ADMIN",
}));

const { GET, POST } = await import("@/app/api/flows/route");
const {
  GET: GET_ONE,
  PATCH,
  DELETE,
} = await import("@/app/api/flows/[id]/route");
const { FLOW_TEMPLATES } = await import("@/lib/telegram/flow-templates");

const VALID_STEPS = [
  {
    id: "s1",
    message: "Nima qiziqtiradi?",
    options: [{ label: "Narx", nextStepId: null }],
  },
];

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/flows", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("flows API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkspaceId.mockResolvedValue("ws1");
    mockGetContext.mockResolvedValue({ workspaceId: "ws1", role: "OWNER" });
  });

  describe("authorization", () => {
    it("401s the list when signed out", async () => {
      mockGetWorkspaceId.mockResolvedValue(null);

      const res = await GET();

      expect(res.status).toBe(401);
    });

    it("403s a member trying to create a flow", async () => {
      mockGetContext.mockResolvedValue({ workspaceId: "ws1", role: "MEMBER" });

      const res = await POST(jsonRequest({ name: "X", steps: VALID_STEPS }));

      expect(res.status).toBe(403);
      expect(mockPrisma.telegramFlow.create).not.toHaveBeenCalled();
    });

    it("reads another workspace's flow as absent, not forbidden", async () => {
      // Scoped by workspace in the query, so the id simply does not resolve.
      mockPrisma.telegramFlow.findFirst.mockResolvedValue(null);

      const res = await GET_ONE({} as never, params("someone-elses-flow"));

      expect(res.status).toBe(404);
      expect(mockPrisma.telegramFlow.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "someone-elses-flow", workspaceId: "ws1" },
        })
      );
    });
  });

  describe("listing", () => {
    it("summarizes each flow and surfaces whether it is broken", async () => {
      mockPrisma.telegramFlow.findMany.mockResolvedValue([
        {
          id: "f1",
          name: "Narx",
          steps: VALID_STEPS,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { conversations: 12 },
        },
        {
          id: "f2",
          name: "Buzuq",
          // Points at a step that does not exist.
          steps: [{ id: "a", message: "Salom", nextStepId: "gone" }],
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { conversations: 0 },
        },
      ]);

      const body = await (await GET()).json();

      expect(body.flows[0]).toMatchObject({
        id: "f1",
        stepCount: 1,
        conversationCount: 12,
        valid: true,
      });
      // The list is where a broken flow has to be visible — the editor is the
      // one screen you are not looking at when a funnel stops converting.
      expect(body.flows[1]).toMatchObject({ id: "f2", valid: false, errorCount: 1 });
    });
  });

  describe("creating", () => {
    it("creates from a template (D3)", async () => {
      mockPrisma.telegramFlow.create.mockResolvedValue({ id: "f1" });

      const res = await POST(
        jsonRequest({ name: "Narx so'rovi", templateId: "price-enquiry" })
      );

      expect(res.status).toBe(201);
      const data = mockPrisma.telegramFlow.create.mock.calls[0][0].data;
      expect(data.workspaceId).toBe("ws1");
      expect(data.steps[0].id).toBe("start");
    });

    it("rejects an unknown template", async () => {
      const res = await POST(jsonRequest({ name: "X", templateId: "nope" }));

      expect(res.status).toBe(400);
      expect(mockPrisma.telegramFlow.create).not.toHaveBeenCalled();
    });

    it("requires either a template or steps", async () => {
      const res = await POST(jsonRequest({ name: "X" }));

      expect(res.status).toBe(400);
    });
  });

  describe("updating", () => {
    beforeEach(() => {
      mockPrisma.telegramFlow.findFirst.mockResolvedValue({ id: "f1" });
      mockPrisma.telegramFlow.update.mockResolvedValue({ id: "f1" });
    });

    it("saves a valid flow", async () => {
      const res = await PATCH(
        jsonRequest({ steps: VALID_STEPS }),
        params("f1")
      );

      expect(res.status).toBe(200);
      expect(mockPrisma.telegramFlow.update).toHaveBeenCalled();
    });

    // D5 is enforced server-side, not only in the editor: the editor is not the
    // only thing that can call this.
    it("refuses to store a flow that can never end", async () => {
      const res = await PATCH(
        jsonRequest({
          steps: [
            { id: "a", message: "Bir", nextStepId: "b" },
            { id: "b", message: "Ikki", nextStepId: "a" },
          ],
        }),
        params("f1")
      );

      expect(res.status).toBe(422);
      expect(mockPrisma.telegramFlow.update).not.toHaveBeenCalled();
      const body = await res.json();
      expect(body.validation.errors[0].code).toBe("NO_TERMINAL_STATE");
    });

    it("stores a flow with an unreachable step but reports the warning", async () => {
      const res = await PATCH(
        jsonRequest({
          steps: [
            { id: "a", message: "Salom", nextStepId: null },
            { id: "orphan", message: "Hech kim", nextStepId: null },
          ],
        }),
        params("f1")
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.validation.warnings[0].code).toBe("UNREACHABLE_STEP");
    });

    it("404s an id from another workspace", async () => {
      mockPrisma.telegramFlow.findFirst.mockResolvedValue(null);

      const res = await PATCH(jsonRequest({ name: "X" }), params("f1"));

      expect(res.status).toBe(404);
      expect(mockPrisma.telegramFlow.update).not.toHaveBeenCalled();
    });
  });

  describe("deleting", () => {
    it("deletes scoped to the workspace", async () => {
      mockPrisma.telegramFlow.deleteMany.mockResolvedValue({ count: 1 });

      const res = await DELETE({} as never, params("f1"));

      expect(res.status).toBe(200);
      expect(mockPrisma.telegramFlow.deleteMany).toHaveBeenCalledWith({
        where: { id: "f1", workspaceId: "ws1" },
      });
    });

    it("404s when nothing matched", async () => {
      mockPrisma.telegramFlow.deleteMany.mockResolvedValue({ count: 0 });

      const res = await DELETE({} as never, params("f1"));

      expect(res.status).toBe(404);
    });
  });
});

describe("flow templates (D3)", () => {
  it("ships three complete funnels", () => {
    expect(FLOW_TEMPLATES).toHaveLength(3);
  });

  // A template that ships broken teaches the wrong thing on someone's first
  // contact with the product.
  it.each(FLOW_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s is a valid flow",
    async (_id, template) => {
      const { validateFlow } = await import("@/lib/telegram/flow-validation");
      const result = validateFlow(template.steps);

      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.valid).toBe(true);
    }
  );

  it("survives the forgiving parser unchanged", async () => {
    // The templates are written by hand; if one drifts out of the shape the
    // runtime parser accepts, steps would silently disappear.
    const { parseFlowSteps } = await import("@/lib/telegram/flow-types");
    for (const template of FLOW_TEMPLATES) {
      expect(parseFlowSteps(template.steps)).toHaveLength(template.steps.length);
    }
  });
});
