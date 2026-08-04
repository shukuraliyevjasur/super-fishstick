import type { WorkspacePlan } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";

/**
 * The one place `workspace.plan` is ever written.
 *
 * D2 in DECISIONS.md: plans are granted by an admin endpoint now, and move to a
 * payment webhook (Click / Payme / Uzum) as soon as that is practical. The whole
 * point of doing the admin route first is that swapping the trigger must be
 * cheap — so the logic lives here, in a function, and the route is a thin caller.
 * When the webhook lands it calls this with `source: "PAYMENT_WEBHOOK"` and
 * needs no other change.
 *
 * Every grant writes an OperationalEvent. Manual billing without a trail becomes
 * unrecoverable quickly, and the plan columns only hold the *latest* grant — the
 * event log is the history.
 */

export type PlanGrantSource = "ADMIN" | "PAYMENT_WEBHOOK";

export interface GrantPlanInput {
  workspaceId: string;
  plan: WorkspacePlan;
  /**
   * Who performed the grant. A user id for a manual grant, or an identifier
   * like `webhook:click` for an automated one. Free-form on purpose: the audit
   * row must outlive the actor's account.
   */
  grantedBy: string;
  /** `null` or omitted means the plan does not expire. */
  expiresAt?: Date | null;
  /** Free-text context — payment reference, support ticket, "refund". */
  reason?: string;
  source?: PlanGrantSource;
}

export interface PlanGrantResult {
  workspaceId: string;
  previousPlan: WorkspacePlan;
  plan: WorkspacePlan;
  planExpiresAt: Date | null;
}

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`Workspace ${workspaceId} not found`);
    this.name = "WorkspaceNotFoundError";
  }
}

export async function grantWorkspacePlan({
  workspaceId,
  plan,
  grantedBy,
  expiresAt = null,
  reason,
  source = "ADMIN",
}: GrantPlanInput): Promise<PlanGrantResult> {
  const grantedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, plan: true },
    });

    if (!existing) {
      throw new WorkspaceNotFoundError(workspaceId);
    }

    const updated = await tx.workspace.update({
      where: { id: workspaceId },
      data: {
        plan,
        planGrantedAt: grantedAt,
        planGrantedBy: grantedBy,
        planExpiresAt: expiresAt,
      },
      select: { plan: true, planExpiresAt: true },
    });

    // In the same transaction as the write: a plan change that left no trail
    // would be worse than one that did not happen.
    await tx.operationalEvent.create({
      data: {
        workspaceId,
        source: "SYSTEM",
        level: "INFO",
        message: `Plan ${existing.plan} → ${plan} by ${grantedBy}`,
        payload: {
          kind: "plan_grant",
          source,
          previousPlan: existing.plan,
          plan,
          grantedBy,
          grantedAt: grantedAt.toISOString(),
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          reason: reason ?? null,
        },
      },
    });

    return {
      workspaceId,
      previousPlan: existing.plan,
      plan: updated.plan,
      planExpiresAt: updated.planExpiresAt,
    };
  });
}

/**
 * Drops expired paid workspaces back to FREE (P4).
 *
 * Enforcement does not depend on this running — `getEffectivePlan()` already
 * treats an expired plan as FREE at every gate, so a workspace loses paid
 * features the moment it expires rather than whenever the sweep next fires.
 * This exists so the stored row eventually matches reality, which matters
 * because Vercel's free tier only runs crons once a day.
 */
export async function downgradeExpiredWorkspaces(
  now: Date = new Date()
): Promise<{ downgraded: number }> {
  const expired = await prisma.workspace.findMany({
    where: {
      plan: { not: "FREE" },
      planExpiresAt: { not: null, lte: now },
    },
    select: { id: true, plan: true, planExpiresAt: true },
  });

  for (const workspace of expired) {
    await grantWorkspacePlan({
      workspaceId: workspace.id,
      plan: "FREE",
      grantedBy: "system:expiry",
      reason: `Plan ${workspace.plan} expired at ${workspace.planExpiresAt?.toISOString()}`,
    });
  }

  return { downgraded: expired.length };
}
