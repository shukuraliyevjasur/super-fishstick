/**
 * Per-workspace Telegram bot management (D5).
 *
 * A workspace can connect its own bot token, which is then used for
 * conversations and broadcasts instead of the shared @replie_bot.
 * Without an own bot, broadcast is blocked — one shared-bot spammer can
 * get @replie_bot banned and kill every customer's flows at once.
 *
 * The token is stored encrypted with the same AES-256-GCM key used for
 * Instagram access tokens (lib/meta/oauth.ts). The bot's @username is
 * stored plaintext because it is already public — it is visible in every
 * t.me deep link the campaign builder generates.
 */

import { Bot } from "grammy";
import { encryptToken, decryptToken } from "@/lib/meta/oauth";
import { prisma } from "@/lib/db/client";
import { getSharedBot, createCustomBot } from "@/lib/telegram/client";

export interface WorkspaceBot {
  bot: Bot;
  /** Stable key for the rate-limiter bucket (botId, not botUsername). */
  rateLimitKey: string;
  isOwn: boolean;
  username: string | null;
}

/**
 * Validate a raw bot token by calling getMe, then save it encrypted.
 * Returns the bot's @username on success.
 * Throws if the token is invalid or Telegram is unreachable.
 */
export async function setWorkspaceBotToken(
  workspaceId: string,
  plainToken: string
): Promise<string> {
  const probe = new Bot(plainToken);
  // getMe validates the token and returns the bot's identity.
  const me = await probe.api.getMe();
  const botUsername = me.username ?? me.first_name;

  const encrypted = encryptToken(plainToken);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      telegramBotToken: encrypted,
      telegramBotUsername: botUsername,
    },
  });

  return botUsername;
}

export async function clearWorkspaceBotToken(workspaceId: string): Promise<void> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { telegramBotToken: null, telegramBotUsername: null },
  });
}

/**
 * Return the workspace's own bot if configured, or the shared bot as a
 * fallback. The `rateLimitKey` is what `reserveTelegramSlot` uses — each
 * own bot gets its own 30 msg/s bucket, isolated from other workspaces.
 */
export async function getWorkspaceBot(workspaceId: string): Promise<WorkspaceBot> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { telegramBotToken: true, telegramBotUsername: true },
  });

  if (workspace?.telegramBotToken) {
    const plainToken = decryptToken(workspace.telegramBotToken);
    return {
      bot: createCustomBot(plainToken),
      rateLimitKey: `ws:${workspaceId}`,
      isOwn: true,
      username: workspace.telegramBotUsername ?? null,
    };
  }

  return {
    bot: getSharedBot(),
    rateLimitKey: "shared",
    isOwn: false,
    username: process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? null,
  };
}

/** True only when a workspace has its own bot token saved. */
export async function hasOwnBot(workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { telegramBotToken: true },
  });
  return Boolean(workspace?.telegramBotToken);
}

/** Status shown in the settings UI — safe to send to the client. */
export async function getOwnBotStatus(
  workspaceId: string
): Promise<{ configured: boolean; botUsername: string | null }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { telegramBotToken: true, telegramBotUsername: true },
  });
  return {
    configured: Boolean(workspace?.telegramBotToken),
    botUsername: workspace?.telegramBotUsername ?? null,
  };
}
