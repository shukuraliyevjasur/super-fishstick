import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getTelegramDashboard } from "@/lib/data/telegram-dashboard";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getOwnBotStatus } from "@/lib/telegram/own-bot";
import TelegramHome from "@/components/telegram/telegram-home";

type Props = { params: Promise<{ lang: string }> };

export default async function TelegramPage({ params }: Props) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "uz";
  const [dict, workspaceId] = await Promise.all([getDictionary(locale), getCurrentWorkspaceId()]);
  if (!workspaceId) redirect(`/${locale}/login`);

  const botStatus = await getOwnBotStatus(workspaceId);
  const dashboard = botStatus.configured && botStatus.botId
    ? await getTelegramDashboard(workspaceId, botStatus.botId)
    : null;

  return <TelegramHome dict={dict.telegram} lang={locale} botReady={botStatus.configured} botUsername={botStatus.botUsername} dashboard={dashboard} />;
}
