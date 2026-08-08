-- T10: opt-in Telegram destination on a campaign, plus the flow picker (D8).
--
-- Both columns are additive and defaulted, so existing rows keep working and
-- every campaign that does not use Telegram is unaffected.

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telegramFlowId" TEXT;

-- CreateIndex
CREATE INDEX "Automation_telegramFlowId_idx" ON "Automation"("telegramFlowId");

-- AddForeignKey
-- ON DELETE SET NULL: deleting a flow must not delete the campaigns pointing at
-- it. The campaign simply loses its Telegram destination.
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_telegramFlowId_fkey" FOREIGN KEY ("telegramFlowId") REFERENCES "TelegramFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
