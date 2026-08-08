-- T8/E8: paced broadcast with per-recipient checkpointing.

-- AlterTable: conversations need a send address of their own.
-- Backfilled from telegramUserId, which is what chat.id equals in a private
-- chat — true for every row that exists today, and the reason the column is
-- added rather than the assumption being kept.
ALTER TABLE "TelegramConversation" ADD COLUMN "chatId" BIGINT;
UPDATE "TelegramConversation" SET "chatId" = "telegramUserId" WHERE "chatId" IS NULL;
ALTER TABLE "TelegramConversation" ALTER COLUMN "chatId" SET NOT NULL;

-- CreateTable
CREATE TABLE "TelegramBroadcast" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "flowId" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "telegramUserId" BIGINT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "TelegramBroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramBroadcast_workspaceId_status_idx" ON "TelegramBroadcast"("workspaceId", "status");

-- CreateIndex
-- The uniqueness that makes a resumed run safe: the same person cannot be
-- enrolled in one broadcast twice.
CREATE UNIQUE INDEX "TelegramBroadcastRecipient_broadcastId_telegramUserId_key" ON "TelegramBroadcastRecipient"("broadcastId", "telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramBroadcastRecipient_broadcastId_status_idx" ON "TelegramBroadcastRecipient"("broadcastId", "status");

-- AddForeignKey
ALTER TABLE "TelegramBroadcast" ADD CONSTRAINT "TelegramBroadcast_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBroadcastRecipient" ADD CONSTRAINT "TelegramBroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "TelegramBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
