-- Own bots need their own authenticated webhook and audience. A Telegram chat
-- can only receive a bot's messages after that exact bot was started.

ALTER TABLE "Workspace" ADD COLUMN "telegramBotId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "telegramBotWebhookSecretHash" TEXT;

ALTER TABLE "TelegramBroadcast" ADD COLUMN "botId" TEXT NOT NULL DEFAULT 'shared';

ALTER TABLE "TelegramConversation" ADD COLUMN "botId" TEXT NOT NULL DEFAULT 'shared';
DROP INDEX "TelegramConversation_telegramUserId_workspaceId_key";
CREATE UNIQUE INDEX "TelegramConversation_telegramUserId_workspaceId_botId_key"
  ON "TelegramConversation"("telegramUserId", "workspaceId", "botId");
CREATE INDEX "TelegramConversation_workspaceId_botId_idx"
  ON "TelegramConversation"("workspaceId", "botId");
CREATE INDEX "TelegramConversation_workspaceId_botId_flowId_idx"
  ON "TelegramConversation"("workspaceId", "botId", "flowId");
CREATE INDEX "TelegramBroadcast_workspaceId_botId_idx"
  ON "TelegramBroadcast"("workspaceId", "botId");
