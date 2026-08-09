import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isCurrentUserPlatformAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/client";
import GrantForm from "@/components/admin/grant-form";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  STANDART: "Standard",
  PRO: "Pro",
  AGENCY: "Agency",
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-border text-muted border border-border-hover",
  STANDART: "bg-accent/10 text-accent border border-accent/20",
  PRO: "bg-amber-100 text-amber-700 border border-amber-200",
  AGENCY: "bg-purple-100 text-purple-700 border border-purple-200",
};

export default async function ControlPage() {
  const [session, isAdmin] = await Promise.all([
    auth(),
    isCurrentUserPlatformAdmin(),
  ]);

  if (!session?.user?.id || !isAdmin) {
    redirect("/");
  }

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      plan: true,
      planGrantedAt: true,
      planExpiresAt: true,
      createdAt: true,
      _count: { select: { members: true } },
      members: {
        where: { role: "OWNER" },
        select: { user: { select: { email: true } } },
        take: 1,
      },
    },
  });

  const now = new Date();

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">replie</h1>
          <p className="text-xs text-muted mt-0.5">{session.user.email}</p>
        </div>
        <a
          href="/uz/dashboard"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          ← App
        </a>
      </div>

      <p className="text-sm text-muted">
        {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-3">
        {workspaces.map((ws) => {
          const ownerEmail = ws.members[0]?.user?.email ?? "—";
          const expired = ws.planExpiresAt !== null && ws.planExpiresAt <= now;
          const expiresLabel = ws.planExpiresAt
            ? expired
              ? `Expired ${ws.planExpiresAt.toLocaleDateString()}`
              : `Until ${ws.planExpiresAt.toLocaleDateString()}`
            : null;

          return (
            <div key={ws.id} className="panel rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {ws.name}
                  </p>
                  <p className="text-xs text-muted">{ownerEmail}</p>
                  <p className="text-xs text-muted">
                    {ws._count.members} member{ws._count.members !== 1 ? "s" : ""} ·{" "}
                    {ws.createdAt.toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLORS[ws.plan] ?? PLAN_COLORS.FREE}`}
                  >
                    {PLAN_LABELS[ws.plan] ?? ws.plan}
                  </span>
                  {expiresLabel && (
                    <span className={`text-xs ${expired ? "text-error" : "text-muted"}`}>
                      {expiresLabel}
                    </span>
                  )}
                </div>
              </div>

              <GrantForm workspaceId={ws.id} currentPlan={ws.plan} />
            </div>
          );
        })}

        {workspaces.length === 0 && (
          <div className="panel rounded-lg p-8 text-center">
            <p className="text-sm text-muted">No workspaces yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
