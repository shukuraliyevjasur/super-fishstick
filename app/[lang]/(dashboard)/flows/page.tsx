import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getFlows } from "@/lib/data/flows";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { FLOW_TEMPLATES } from "@/lib/telegram/flow-templates";
import FlowList from "@/components/flows/flow-list";

type Props = { params: Promise<{ lang: string }> };

export default async function FlowsPage({ params }: Props) {
  const { lang } = await params;

  const locale = hasLocale(lang) ? lang : "uz";
  const dict = await getDictionary(locale);

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect(`/${locale}/login`);

  const flows = await getFlows(workspaceId);

  return (
    <FlowList
      initialFlows={flows}
      templates={FLOW_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        stepCount: template.steps.length,
      }))}
      lang={locale}
      dict={dict.flows}
    />
  );
}
