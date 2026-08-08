-- T3: TelegramFlow + TelegramConversation models

-- CreateTable
CREATE TABLE "TelegramFlow" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramConversation" (
    "id" TEXT NOT NULL,
    "telegramUserId" BIGINT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "currentStepId" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramFlow_workspaceId_idx" ON "TelegramFlow"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramConversation_telegramUserId_workspaceId_key" ON "TelegramConversation"("telegramUserId", "workspaceId");

-- CreateIndex
CREATE INDEX "TelegramConversation_workspaceId_idx" ON "TelegramConversation"("workspaceId");

-- CreateIndex
CREATE INDEX "TelegramConversation_flowId_idx" ON "TelegramConversation"("flowId");

-- CreateIndex (E9: enables TTL sweep without full table scan)
CREATE INDEX "TelegramConversation_lastActiveAt_idx" ON "TelegramConversation"("lastActiveAt");

-- AddForeignKey
ALTER TABLE "TelegramFlow" ADD CONSTRAINT "TelegramFlow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramConversation" ADD CONSTRAINT "TelegramConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramConversation" ADD CONSTRAINT "TelegramConversation_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "TelegramFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
