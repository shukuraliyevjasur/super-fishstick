import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getBroadcasts } from "@/lib/data/broadcasts";
import { getFlows } from "@/lib/data/flows";
import { getDictionary, hasLocale } from "@/lib/i18n";
import BroadcastList from "@/components/broadcasts/broadcast-list";

type Props = { params: Promise<{ lang: string }> };

export default async function BroadcastsPage({ params }: Props) {
  const { lang } = await params;

  const locale = hasLocale(lang) ? lang : "uz";
  const dict = await getDictionary(locale);

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect(`/${locale}/login`);

  const [broadcasts, flows] = await Promise.all([
    getBroadcasts(workspaceId),
    getFlows(workspaceId),
  ]);

  return (
    <BroadcastList
      initialBroadcasts={broadcasts}
      flows={flows.map((flow) => ({ id: flow.id, name: flow.name }))}
      dict={dict.broadcasts}
    />
  );
}
