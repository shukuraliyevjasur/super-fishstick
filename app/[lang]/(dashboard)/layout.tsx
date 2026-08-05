import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { hasLocale } from "@/lib/i18n";
import DashboardShell from "@/components/dashboard-shell";
import VerifyEmailBanner from "@/components/verify-email-banner";

type Props = { children: ReactNode; params: Promise<{ lang: string }> };

export default async function DashboardLayout({
  children,
  params,
}: Props) {
  const { lang } = await params;

  const session = await auth();
  const locale = hasLocale(lang) ? lang : "uz";
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  // Run credentials check and workspace fetch in parallel — both only need
  // the user id from the already-resolved session.
  const [credentials, workspace] = await Promise.all([
    // Accounts created by a magic link (and any predating password sign-in)
    // have no password yet. Prompt once; /set-password is outside this layout
    // so this cannot loop.
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, emailVerified: true },
    }),
    ensureWorkspaceForUser(session.user.id, session.user.email),
  ]);

  if (!credentials?.passwordHash) {
    redirect(`/${locale}/set-password`);
  }

  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { connectedAt: "desc" },
    select: { username: true },
  });

  return (
    <DashboardShell
      workspaceName={workspace.name}
      plan={workspace.plan}
      instagramUsername={accounts[0]?.username ?? null}
      instagramAccountCount={accounts.length}
    >
      {!credentials.emailVerified && <VerifyEmailBanner lang={locale} />}
      {children}
    </DashboardShell>
  );
}
