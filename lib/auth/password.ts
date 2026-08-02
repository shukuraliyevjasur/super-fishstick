import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing on Node's built-in scrypt.
 *
 * Deliberately not bcrypt or argon2: both are native modules, and installing one
 * would regenerate `package-lock.json`. Per HANDOFF.md, a lockfile regenerated on
 * Windows installs fine locally and then fails `npm ci` on Linux. scrypt ships
 * with Node, so this costs no dependency at all.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// N=2^15 with r=8 needs 128*N*r = 32 MiB, which is exactly Node's default maxmem
// ceiling — so maxmem is raised explicitly rather than left to trip the default.
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_BYTES = 64;
const SALT_BYTES = 16;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Encodes as `scrypt$N$r$p$salt$hash` so the cost parameters travel with the
 * hash: raising them later still leaves old hashes verifiable.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, KEY_BYTES, PARAMS);

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/** Constant-time verify. Returns false rather than throwing on a malformed hash. */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const N = Number(n);
  const R = Number(r);
  const P = Number(p);
  if (!Number.isFinite(N) || !Number.isFinite(R) || !Number.isFinite(P)) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const derived = await scryptAsync(password, salt, expected.length, {
      N,
      r: R,
      p: P,
      maxmem: PARAMS.maxmem,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// Verified against on a missing account so that "no such user" and "wrong
// password" take comparable time, instead of the miss returning instantly and
// leaking which emails are registered.
const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "A".repeat(86) +
  "==";

export async function fakeVerify(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
}

/** Returns an error key for the i18n dictionary, or null when acceptable. */
export function validatePassword(password: string): "tooShort" | null {
  return password.length < MIN_PASSWORD_LENGTH ? "tooShort" : null;
}
