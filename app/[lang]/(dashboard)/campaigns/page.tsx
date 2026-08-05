import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getCampaigns } from "@/lib/data/campaigns";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { prisma } from "@/lib/db/client";
import CampaignList from "@/components/campaigns/campaign-list";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ accountId?: string }>;
};

export default async function CampaignsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { accountId } = (await searchParams) ?? {};

  const locale = hasLocale(lang) ? lang : "uz";
  const dict = await getDictionary(locale);

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect(`/${locale}/login`);

  const [campaigns, accounts] = await Promise.all([
    getCampaigns(workspaceId, accountId),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true, instagramId: true, name: true },
    }),
  ]);

  return (
    <CampaignList
      initialCampaigns={campaigns}
      initialAccounts={accounts}
      selectedAccountId={accountId ?? "all"}
      lang={locale}
      dict={dict.campaigns}
    />
  );
}
