import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  normaliseEmail: (value: unknown) =>
    String(value ?? "").trim().toLowerCase(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

import {
  isAdminEmail,
  isCurrentUserPlatformAdmin,
  parseAdminEmails,
} from "../lib/auth/admin";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseAdminEmails", () => {
  it("splits, trims and lowercases", () => {
    expect(parseAdminEmails(" A@x.com , b@Y.com ")).toEqual([
      "a@x.com",
      "b@y.com",
    ]);
  });

  it("returns nothing for unset or empty values", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("  , ,  ")).toEqual([]);
  });
});

describe("isAdminEmail", () => {
  it("grants nobody when ADMIN_EMAILS is unset — fails closed", () => {
    expect(isAdminEmail("owner@replie.uz", undefined)).toBe(false);
    expect(isAdminEmail("owner@replie.uz", "")).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(isAdminEmail("Owner@Replie.UZ", "owner@replie.uz")).toBe(true);
  });

  it("rejects an address not on the list", () => {
    expect(isAdminEmail("attacker@evil.example", "owner@replie.uz")).toBe(false);
  });

  it("rejects a missing address", () => {
    expect(isAdminEmail(null, "owner@replie.uz")).toBe(false);
    expect(isAdminEmail(undefined, "owner@replie.uz")).toBe(false);
  });
});

describe("isCurrentUserPlatformAdmin", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "owner@replie.uz");
  });

  it("is false without a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(isCurrentUserPlatformAdmin()).resolves.toBe(false);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("is false for a signed-in non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "customer@example.com",
      emailVerified: new Date(),
    });
    await expect(isCurrentUserPlatformAdmin()).resolves.toBe(false);
  });

  it("is false when the admin address is not verified", async () => {
    // Otherwise listing an unregistered address in ADMIN_EMAILS would hand
    // platform admin to whoever signs up with it first.
    mockAuth.mockResolvedValue({ user: { id: "user_1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "owner@replie.uz",
      emailVerified: null,
    });
    await expect(isCurrentUserPlatformAdmin()).resolves.toBe(false);
  });

  it("is true for a verified listed address", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "owner@replie.uz",
      emailVerified: new Date(),
    });
    await expect(isCurrentUserPlatformAdmin()).resolves.toBe(true);
  });

  it("reads the address from the database, not the session token", async () => {
    // Sessions are JWT-backed and not revocable (D1), so a stale token must not
    // be able to assert an address the account no longer has.
    mockAuth.mockResolvedValue({
      user: { id: "user_1", email: "owner@replie.uz" },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "downgraded@example.com",
      emailVerified: new Date(),
    });
    await expect(isCurrentUserPlatformAdmin()).resolves.toBe(false);
  });
});
