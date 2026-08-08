// No `server-only` import here, deliberately. That specifier is resolved by
// Next's bundler and is not a real installed package, so importing it from a
// module the standalone worker also loads crashes the worker at boot. This file
// is reached from lib/queue/telegram-worker.ts.
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";

/**
 * Linking a builder's own Telegram account (D4).
 *
 * A test send has to go somewhere, and the bot only learns a chat id when the
 * person messages it. So: mint a short code, put it in a /start deep link, and
 * bind the account when they tap it.
 *
 * The code is opaque and stored rather than signed. Telegram caps the /start
 * payload at 64 characters — an HMAC token like `lib/meta/reveal-token.ts`
 * mints does not fit — and a stored code can be revoked, which a signed one
 * cannot.
 */

export const LINK_CODE_PREFIX = "lnk_";
const LINK_CODE_TTL_MS = 15 * 60 * 1000;

/** 16 base64url chars. With `lnk_` that is 20, well inside Telegram's 64. */
function generateCode(): string {
  return randomBytes(12).toString("base64url");
}

export async function createLinkCode(userId: string): Promise<string> {
  const code = generateCode();

  // One pending code per user: minting a second must invalidate the first, so
  // a code shoulder-surfed from an old screen cannot be redeemed later.
  await prisma.telegramLinkCode.deleteMany({ where: { userId } });
  await prisma.telegramLinkCode.create({
    data: { code, userId, expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS) },
  });

  return code;
}

export function isLinkPayload(payload: string): boolean {
  return payload.startsWith(LINK_CODE_PREFIX);
}

/**
 * Redeem a code and bind the account. One-time: the code is deleted whether or
 * not it was still valid, so a leaked payload cannot be replayed.
 *
 * Returns the user id on success, null on an unknown or expired code.
 */
export async function redeemLinkCode(
  payload: string,
  telegramUserId: bigint,
  chatId: bigint
): Promise<string | null> {
  const code = payload.slice(LINK_CODE_PREFIX.length);
  if (!code) return null;

  const record = await prisma.telegramLinkCode.findUnique({ where: { code } });
  if (!record) return null;

  await prisma.telegramLinkCode.delete({ where: { code } }).catch(() => {});

  if (record.expiresAt.getTime() < Date.now()) return null;

  // Upsert on userId: re-linking replaces the binding. Someone switching
  // Telegram accounts must not keep receiving test sends on the old one.
  await prisma.telegramLink.upsert({
    where: { userId: record.userId },
    create: { userId: record.userId, telegramUserId, chatId },
    update: { telegramUserId, chatId, linkedAt: new Date() },
  });

  return record.userId;
}

export async function getLinkForUser(userId: string) {
  return prisma.telegramLink.findUnique({
    where: { userId },
    select: { telegramUserId: true, chatId: true, linkedAt: true },
  });
}
