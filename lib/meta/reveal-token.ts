import { createHmac, timingSafeEqual } from "crypto";

interface TokenData {
  a: string; // instagramAccountId
  u: string; // userId (commenter IGSID)
  p: string; // payload: "reveal:<automationId>" | "followcheck:<automationId>"
  e: number; // expiry ms
}

function signingKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY is required for reveal tokens");
  return key;
}

export function signRevealToken(opts: {
  instagramAccountId: string;
  userId: string;
  payload: string;
  ttlMs?: number;
}): string {
  const data: TokenData = {
    a: opts.instagramAccountId,
    u: opts.userId,
    p: opts.payload,
    e: Date.now() + (opts.ttlMs ?? 7 * 24 * 60 * 60 * 1000),
  };
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyRevealToken(token: string): {
  instagramAccountId: string;
  userId: string;
  payload: string;
} | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac("sha256", signingKey())
    .update(body)
    .digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  let data: TokenData;
  try {
    data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenData;
  } catch {
    return null;
  }

  if (!data.a || !data.u || !data.p || data.e < Date.now()) return null;

  return { instagramAccountId: data.a, userId: data.u, payload: data.p };
}
