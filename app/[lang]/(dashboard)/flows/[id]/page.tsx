import { notFound, redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { parseFlowSteps } from "@/lib/telegram/flow-types";
import { hasOwnBot } from "@/lib/telegram/own-bot";
import FlowEditor from "@/components/flows/flow-editor";

type Props = { params: Promise<{ lang: string; id: string }> };

export default async function FlowEditorPage({ params }: Props) {
  const { lang, id } = await params;

  const locale = hasLocale(lang) ? lang : "uz";
  const dict = await getDictionary(locale);

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect(`/${locale}/login`);

  if (!(await hasOwnBot(workspaceId))) redirect(`/${locale}/telegram`);

  // Scoped by workspace: an id from another workspace is a 404, not a 403.
  const flow = await prisma.telegramFlow.findFirst({
    where: { id, workspaceId },
    select: { id: true, name: true, steps: true, isActive: true },
  });

  if (!flow) notFound();

  return (
    <FlowEditor
      flowId={flow.id}
      initialName={flow.name}
      initialSteps={parseFlowSteps(flow.steps)}
      initialActive={flow.isActive}
      lang={locale}
      dict={dict.flowEditor}
    />
  );
}
