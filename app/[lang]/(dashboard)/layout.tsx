import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { hasLocale } from "@/lib/i18n";
import DashboardShell from "@/components/dashboard-shell";

type Props = { children: ReactNode; params: Promise<{ lang: string }> };

export default async function DashboardLayout({
  children,
  params,
}: Props) {
  const { lang } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    const locale = hasLocale(lang) ? lang : "uz";
    redirect(`/${locale}/login`);
  }

  const workspace = await ensureWorkspaceForUser(
    session.user.id,
    session.user.email
  );
  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { connectedAt: "desc" },
    select: { username: true },
  });

  return (
    <DashboardShell
      workspaceName={workspace.name}
      instagramUsername={accounts[0]?.username ?? null}
      instagramAccountCount={accounts.length}
    >
      {children}
    </DashboardShell>
  );
}
