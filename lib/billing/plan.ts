import type { WorkspacePlan } from "@/app/generated/prisma/client";

export const PLAN_LIMITS = {
  FREE: {
    maxInstagramAccounts: 1,
    maxActiveAutomations: 2,
    maxDmsPerMonth: 100,
    trackedLinks: false,
    followGate: false,
    openingDm: false,
    csvImport: false,
    multiUser: false,
    clientReports: false,
    prioritySupport: false,
    whitelabelReports: false,
  },
  STANDART: {
    maxInstagramAccounts: 1,
    maxActiveAutomations: Infinity,
    maxDmsPerMonth: 3_000,
    trackedLinks: true,
    followGate: true,
    openingDm: true,
    csvImport: false,
    multiUser: false,
    clientReports: false,
    prioritySupport: false,
    whitelabelReports: false,
  },
  PRO: {
    maxInstagramAccounts: 5,
    maxActiveAutomations: Infinity,
    maxDmsPerMonth: Infinity,
    trackedLinks: true,
    followGate: true,
    openingDm: true,
    csvImport: true,
    multiUser: true,
    clientReports: true,
    prioritySupport: true,
    whitelabelReports: false,
  },
  AGENCY: {
    maxInstagramAccounts: 20,
    maxActiveAutomations: Infinity,
    maxDmsPerMonth: Infinity,
    trackedLinks: true,
    followGate: true,
    openingDm: true,
    csvImport: true,
    multiUser: true,
    clientReports: true,
    prioritySupport: true,
    whitelabelReports: true,
  },
} satisfies Record<WorkspacePlan, {
  maxInstagramAccounts: number;
  maxActiveAutomations: number;
  maxDmsPerMonth: number;
  trackedLinks: boolean;
  followGate: boolean;
  openingDm: boolean;
  csvImport: boolean;
  multiUser: boolean;
  clientReports: boolean;
  prioritySupport: boolean;
  whitelabelReports: boolean;
}>;

type BooleanFeatureKeys = {
  [K in keyof (typeof PLAN_LIMITS)["FREE"]]: (typeof PLAN_LIMITS)["FREE"][K] extends boolean ? K : never;
}[keyof (typeof PLAN_LIMITS)["FREE"]];

export type PlanFeature = BooleanFeatureKeys;

/** The plan fields any gate needs. Matches a Prisma `select` on Workspace. */
export interface PlanBearing {
  plan: WorkspacePlan;
  planExpiresAt?: Date | null;
}

/**
 * The plan a workspace actually has right now (P4).
 *
 * An expired plan is FREE. Enforcing expiry here rather than relying on the
 * downgrade sweep matters: Vercel's free tier runs crons **once a day**, so a
 * workspace whose plan lapsed just after a run would otherwise keep every paid
 * feature for another 24 hours. The sweep in `downgradeExpiredWorkspaces()`
 * only reconciles the stored row.
 *
 * `planExpiresAt: null` means the plan does not expire, which is how every
 * manually granted plan starts.
 */
export function getEffectivePlan(
  workspace: PlanBearing,
  now: Date = new Date()
): WorkspacePlan {
  if (workspace.plan === "FREE") return "FREE";
  if (!workspace.planExpiresAt) return workspace.plan;
  return workspace.planExpiresAt.getTime() <= now.getTime()
    ? "FREE"
    : workspace.plan;
}

export function getPlanLimits(plan: WorkspacePlan) {
  return PLAN_LIMITS[plan];
}

export function canUseFeature(plan: WorkspacePlan, feature: PlanFeature): boolean {
  return PLAN_LIMITS[plan][feature] as boolean;
}
