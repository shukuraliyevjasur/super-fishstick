/**
 * Per-workspace Telegram bot management.
 *
 * An own bot is not only a sending credential. Telegram allows a bot to send
 * only to people who started that exact bot, so the webhook, conversation and
 * broadcast audience must all be bound to the same Bot API id.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Bot } from "grammy";
import { encryptToken, decryptToken } from "@/lib/meta/oauth";
import { prisma } from "@/lib/db/client";
import { getSharedBot, createCustomBot } from "@/lib/telegram/client";
import { getSiteUrl } from "@/lib/site";

export interface WorkspaceBot {
  bot: Bot;
  /** Stable key for the rate-limiter bucket (bot id, not username). */
  rateLimitKey: string;
  isOwn: boolean;
  username: string | null;
  /** Telegram Bot API id, or "shared" for @replieuz_bot. */
  botId: string;
}

type OwnBotFields = {
  telegramBotToken: string | null;
  telegramBotUsername: string | null;
  telegramBotId: string | null;
  telegramBotWebhookSecretHash: string | null;
};

function isReadyOwnBot(workspace: OwnBotFields | null | undefined): workspace is Required<OwnBotFields> {
  return Boolean(
    workspace?.telegramBotToken &&
      workspace.telegramBotUsername &&
      workspace.telegramBotId &&
      workspace.telegramBotWebhookSecretHash
  );
}

function hashWebhookSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function matchesSecret(expectedHash: string, candidate: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(hashWebhookSecret(candidate), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function webhookUrl(workspaceId: string, secret: string): string {
  return `${getSiteUrl()}/api/telegram/webhook/own/${workspaceId}/${secret}`;
}

/**
 * Validate a raw bot token, configure an authenticated webhook, then persist
 * the credentials. The route credential is stored only as a SHA-256 hash.
 */
export async function setWorkspaceBotToken(
  workspaceId: string,
  plainToken: string
): Promise<string> {
  const probe = new Bot(plainToken);
  const me = await probe.api.getMe();
  if (!me.username) throw new Error("Telegram bot must have a username");

  const botUsername = me.username;
  const botId = String(me.id);
  const webhookSecret = randomBytes(32).toString("base64url");
  const existing = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      telegramBotToken: true,
      telegramBotUsername: true,
      telegramBotId: true,
      telegramBotWebhookSecretHash: true,
    },
  });

  // Persist first so the endpoint can authenticate the moment Telegram accepts
  // it. On API failure we restore the prior complete configuration.
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      telegramBotToken: encryptToken(plainToken),
      telegramBotUsername: botUsername,
      telegramBotId: botId,
      telegramBotWebhookSecretHash: hashWebhookSecret(webhookSecret),
    },
  });

  try {
    await probe.api.setWebhook(webhookUrl(workspaceId, webhookSecret), {
      secret_token: webhookSecret,
      allowed_updates: ["message", "callback_query"],
    });
  } catch (error) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        telegramBotToken: existing?.telegramBotToken ?? null,
        telegramBotUsername: existing?.telegramBotUsername ?? null,
        telegramBotId: existing?.telegramBotId ?? null,
        telegramBotWebhookSecretHash: existing?.telegramBotWebhookSecretHash ?? null,
      },
    });
    throw error;
  }

  // If a different bot was replaced, stop it hitting a route that is no longer
  // valid. Cleanup cannot make the new, confirmed connection fail.
  if (existing?.telegramBotToken && existing.telegramBotId !== botId) {
    try {
      await createCustomBot(decryptToken(existing.telegramBotToken)).api.deleteWebhook();
    } catch (error) {
      console.error("[Telegram Own Bot] Failed to remove previous webhook:", error);
    }
  }

  return botUsername;
}

/** Disconnect and invalidate the route even when Telegram has revoked the token. */
export async function clearWorkspaceBotToken(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { telegramBotToken: true },
  });

  try {
    if (workspace?.telegramBotToken) {
      await createCustomBot(decryptToken(workspace.telegramBotToken)).api.deleteWebhook({
        drop_pending_updates: true,
      });
    }
  } catch (error) {
    console.error("[Telegram Own Bot] Failed to remove webhook:", error);
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      telegramBotToken: null,
      telegramBotUsername: null,
      telegramBotId: null,
      telegramBotWebhookSecretHash: null,
    },
  });
}

/** Return the configured own bot, or the shared bot when none is ready. */
export async function getWorkspaceBot(workspaceId: string): Promise<WorkspaceBot> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      telegramBotToken: true,
      telegramBotUsername: true,
      telegramBotId: true,
      telegramBotWebhookSecretHash: true,
    },
  });

  if (isReadyOwnBot(workspace)) {
    return {
      bot: createCustomBot(decryptToken(workspace.telegramBotToken!)),
      rateLimitKey: `ws:${workspaceId}`,
      isOwn: true,
      username: workspace.telegramBotUsername!,
      botId: workspace.telegramBotId!,
    };
  }

  return {
    bot: getSharedBot(),
    rateLimitKey: "shared",
    isOwn: false,
    username: process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? null,
    botId: "shared",
  };
}

/** True only after an own bot is authenticated and its webhook is configured. */
export async function hasOwnBot(workspaceId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      telegramBotToken: true,
      telegramBotUsername: true,
      telegramBotId: true,
      telegramBotWebhookSecretHash: true,
    },
  });
  return isReadyOwnBot(workspace);
}

/** Status shown in the dashboard. No token or webhook credential is exposed. */
export async function getOwnBotStatus(
  workspaceId: string
): Promise<{ configured: boolean; botUsername: string | null; botId: string | null }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      telegramBotToken: true,
      telegramBotUsername: true,
      telegramBotId: true,
      telegramBotWebhookSecretHash: true,
    },
  });
  const configured = isReadyOwnBot(workspace);
  return {
    configured,
    botUsername: configured ? workspace.telegramBotUsername : null,
    botId: configured ? workspace.telegramBotId : null,
  };
}

/** Authenticate both the secret URL segment and Telegram's secret header. */
export async function getOwnBotWebhookBotId(
  workspaceId: string,
  pathSecret: string,
  headerSecret: string | null
): Promise<string | null> {
  if (!headerSecret) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { telegramBotWebhookSecretHash: true, telegramBotId: true },
  });
  const expectedHash = workspace?.telegramBotWebhookSecretHash;
  return (
    expectedHash &&
    workspace?.telegramBotId &&
    matchesSecret(expectedHash, pathSecret) &&
    matchesSecret(expectedHash, headerSecret)
      ? workspace.telegramBotId
      : null
  );
}
