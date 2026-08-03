import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    trackedLink: {
      findUnique: vi.fn(),
    },
    linkClick: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

import { GET } from "../app/r/[slug]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tracked link redirect route", () => {
  it("logs a workspace-isolated click and redirects to the destination", async () => {
    mockPrisma.trackedLink.findUnique.mockResolvedValue({
      id: "link_123",
      workspaceId: "workspace_123",
      automationId: "automation_123",
      destinationUrl: "https://example.com/offer",
      automation: {
        instagramAccountId: "instagram_account_123",
      },
    });
    mockPrisma.linkClick.create.mockResolvedValue({});

    const response = await GET(
      new Request("https://manychat-alternative.com/r/abc123", {
        headers: {
          "user-agent": "vitest",
          referer: "https://instagram.com/",
          "x-forwarded-for": "203.0.113.10",
        },
      }) as Parameters<typeof GET>[0],
      { params: Promise.resolve({ slug: "abc123" }) }
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/offer");
    expect(mockPrisma.trackedLink.findUnique).toHaveBeenCalledWith({
      where: { slug: "abc123" },
      select: expect.any(Object),
    });
    expect(mockPrisma.linkClick.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace_123",
        automationId: "automation_123",
        instagramAccountId: "instagram_account_123",
        trackedLinkId: "link_123",
        userAgent: "vitest",
        referrer: "https://instagram.com/",
      }),
    });
  });

  it("refuses to bounce a visitor to a non-http destination already in the database", async () => {
    // S3 defence in depth. The schema now rejects these, but rows written while
    // `z.string().url()` accepted any scheme are still stored, and their
    // /r/<slug> links are already in recipients' inboxes.
    mockPrisma.trackedLink.findUnique.mockResolvedValue({
      id: "link_bad",
      workspaceId: "workspace_123",
      automationId: "automation_123",
      destinationUrl: "javascript:alert(1)",
      automation: { instagramAccountId: "instagram_account_123" },
    });
    mockPrisma.linkClick.create.mockResolvedValue({});

    const response = await GET(
      new Request("https://replie.uz/r/abc123") as Parameters<typeof GET>[0],
      { params: Promise.resolve({ slug: "abc123" }) }
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://replie.uz/");
    // The click still happened and is still the customer's data.
    expect(mockPrisma.linkClick.create).toHaveBeenCalled();
  });

  it("redirects unknown slugs to the homepage without logging a click", async () => {
    mockPrisma.trackedLink.findUnique.mockResolvedValue(null);

    const response = await GET(
      new Request("https://manychat-alternative.com/r/missing") as Parameters<
        typeof GET
      >[0],
      { params: Promise.resolve({ slug: "missing" }) }
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://manychat-alternative.com/");
    expect(mockPrisma.linkClick.create).not.toHaveBeenCalled();
  });
});
