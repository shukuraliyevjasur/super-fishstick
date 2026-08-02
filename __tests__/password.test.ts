import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  fakeVerify,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("is case and whitespace sensitive", async () => {
    const hash = await hashPassword("Passw0rd!");
    expect(await verifyPassword("passw0rd!", hash)).toBe(false);
    expect(await verifyPassword("Passw0rd! ", hash)).toBe(false);
  });

  it("salts each hash, so equal passwords produce different digests", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("encodes cost parameters into the hash", async () => {
    const hash = await hashPassword("whatever");
    const [scheme, n, r, p] = hash.split("$");
    expect(scheme).toBe("scrypt");
    expect(Number(n)).toBeGreaterThanOrEqual(16384);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
    expect(hash.split("$")).toHaveLength(6);
  });

  it("returns false for malformed stored hashes instead of throwing", async () => {
    for (const bad of ["", "not-a-hash", "scrypt$1$2$3", "bcrypt$1$2$3$a$b", "$$$$$"]) {
      expect(await verifyPassword("x", bad)).toBe(false);
    }
  });

  it("fakeVerify resolves without throwing, so the enumeration guard cannot 500", async () => {
    await expect(fakeVerify("anything")).resolves.toBeUndefined();
  });
});

describe("validatePassword", () => {
  it("rejects passwords under the minimum length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe("tooShort");
  });

  it("accepts passwords at or over the minimum length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    expect(validatePassword("a much longer passphrase")).toBeNull();
  });
});
