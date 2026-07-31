import type { WorkspacePlan } from "@/app/generated/prisma/client";

export const PLAN_LIMITS = {
  STANDART: {
    maxInstagramAccounts: 1,
    maxActiveAutomations: 5,
    trackedLinks: false,
    followGate: false,
    openingDm: false,
    csvImport: false,
    multiUser: false,
  },
  PRO: {
    maxInstagramAccounts: 3,
    maxActiveAutomations: Infinity,
    trackedLinks: true,
    followGate: true,
    openingDm: true,
    csvImport: true,
    multiUser: true,
  },
} satisfies Record<WorkspacePlan, {
  maxInstagramAccounts: number;
  maxActiveAutomations: number;
  trackedLinks: boolean;
  followGate: boolean;
  openingDm: boolean;
  csvImport: boolean;
  multiUser: boolean;
}>;

export type PlanFeature = keyof typeof PLAN_LIMITS.STANDART extends string
  ? Exclude<keyof typeof PLAN_LIMITS.STANDART, `max${string}`>
  : never;

export function getPlanLimits(plan: WorkspacePlan) {
  return PLAN_LIMITS[plan];
}

export function canUseFeature(plan: WorkspacePlan, feature: "trackedLinks" | "followGate" | "openingDm" | "csvImport" | "multiUser"): boolean {
  return PLAN_LIMITS[plan][feature];
}
