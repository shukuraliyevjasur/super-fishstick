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
}>;

type BooleanFeatureKeys = {
  [K in keyof (typeof PLAN_LIMITS)["FREE"]]: (typeof PLAN_LIMITS)["FREE"][K] extends boolean ? K : never;
}[keyof (typeof PLAN_LIMITS)["FREE"]];

export type PlanFeature = BooleanFeatureKeys;

export function getPlanLimits(plan: WorkspacePlan) {
  return PLAN_LIMITS[plan];
}

export function canUseFeature(plan: WorkspacePlan, feature: PlanFeature): boolean {
  return PLAN_LIMITS[plan][feature] as boolean;
}
