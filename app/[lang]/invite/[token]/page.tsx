import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InvitationAcceptCard from "@/components/invitation-accept-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = {
  title: "replie — Ish maydoni taklifi",
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ lang: string; token: string }> }) {
  const { token } = await params;
  const [session, invitation] = await Promise.all([
    auth(),
    prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: { select: { name: true } } },
    }),
  ]);

  if (!invitation || invitation.status !== "PENDING") notFound();

  const expired = invitation.expiresAt <= new Date();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-12">
        <Link href="/" className="mb-8 text-base font-bold text-foreground">
          replie
        </Link>
        <section className="rounded-lg border border-border bg-surface p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Ish maydoni taklifi
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground">
            {invitation.workspace.name} jamoasiga qo&apos;shilish
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Siz {invitation.email} uchun {invitation.role.toLowerCase()} sifatida taklif qilindingiz.
          </p>
          <div className="mt-8">
            {expired ? (
              <p className="text-sm text-error">
                Ushbu taklifning muddati o&apos;tgan. Ish maydoni egasidan qayta yuborishni so&apos;rang.
              </p>
            ) : (
              <InvitationAcceptCard
                token={token}
                isSignedIn={Boolean(session?.user?.id)}
                invitedEmail={invitation.email}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
