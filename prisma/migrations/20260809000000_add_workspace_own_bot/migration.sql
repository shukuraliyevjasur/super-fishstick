-- AddColumn: own Telegram bot per workspace (D5)
-- telegramBotToken is stored encrypted (AES-256-GCM, same key as Instagram tokens).
-- telegramBotUsername is plaintext — it is public, visible in every t.me deep link.
ALTER TABLE "Workspace" ADD COLUMN "telegramBotToken" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "telegramBotUsername" TEXT;
