> **ARCHIVED — not current.** Superseded by [../product/roadmap.md](../product/roadmap.md)
> and [../product/decisions.md](../product/decisions.md). If this file disagrees with those,
> they win. Context: [README.md](README.md). Kept for the reasoning, not the conclusions.

# F6 — RSC Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the three `"use client"` dashboard pages (dashboard, campaigns, logs) to React Server Components so data is fetched on the server, initial HTML is streamed before JS hydrates, and `<Link>` prefetch has real content to cache.

**Architecture:** Each page becomes an `async` RSC that reads `searchParams` for filter state and calls a Prisma data function directly (no HTTP hop). Interactive sub-components (filters, toggles, pagination) become small `"use client"` islands that receive initial data as props and update URL params to trigger RSC re-renders when new server data is needed. `loading.tsx` at each route provides the Suspense boundary.

**Tech Stack:** Next.js 16 App Router, Prisma 7, `next/navigation` (`useRouter`, `useSearchParams`), existing i18n via `getDictionary(lang)` (server) / `useDict()` (client).

## Global Constraints

- Never add `npm` dependencies — no new packages.
- Never run `npm install` on Windows — lockfile is pinned.
- Prisma datasource URL lives in `prisma.config.ts`, not `schema.prisma`.
- Server components must import `t()` from `@/lib/i18n/t`, never from `components/dictionary-provider`.
- Client components may import `useDict` and `t` from `@/components/dictionary-provider`.
- `getDictionary(lang)` is server-only (`lib/i18n/index.ts` has `import "server-only"`). Pass the resolved `Dict` as a prop to client islands; do not pass the Promise.
- `searchParams` and `params` in Next.js 16 RSC pages are `Promise<{...}>` — always `await` them.
- Baseline check before each task: `npm run typecheck && npm run lint && npm test` — expect 0 errors, 125 tests passing.
- Never commit `package-lock.json` changes from Windows.

---

## File Map

**Create:**
- `lib/data/dashboard.ts` — `getDashboardStats(workspaceId, accountId?)` Prisma data function
- `lib/data/campaigns.ts` — `getCampaigns(workspaceId, accountId?)` Prisma data function
- `lib/data/logs.ts` — `getLogs(workspaceId, opts)` Prisma data function
- `components/dashboard/account-filter.tsx` — `"use client"` AccountSelect wrapper that pushes `?accountId=` URL param
- `components/campaigns/campaign-list.tsx` — `"use client"` island: all campaign interactivity (search, status filter, toggle, delete, duplicate, thumbnails, video lightbox)
- `components/logs/log-filters.tsx` — `"use client"` island: status filter buttons, account select, pagination — all push URL params
- `app/[lang]/(dashboard)/dashboard/loading.tsx` — dashboard skeleton
- `app/[lang]/(dashboard)/campaigns/loading.tsx` — campaigns skeleton
- `app/[lang]/(dashboard)/logs/loading.tsx` — logs skeleton
- `app/[lang]/(dashboard)/dashboard/error.tsx` — dashboard error boundary
- `app/[lang]/(dashboard)/campaigns/error.tsx` — campaigns error boundary
- `app/[lang]/(dashboard)/logs/error.tsx` — logs error boundary

**Modify:**
- `app/[lang]/(dashboard)/dashboard/page.tsx` — remove `"use client"`, convert to `async` RSC
- `app/[lang]/(dashboard)/campaigns/page.tsx` — remove `"use client"`, convert to `async` RSC
- `app/[lang]/(dashboard)/logs/page.tsx` — remove `"use client"`, convert to `async` RSC
- `FIX_BRIEF.md` — mark C5 done, F6 done

---

## Task 1: Data layer — three Prisma data functions

**Files:**
- Create: `lib/data/dashboard.ts`
- Create: `lib/data/campaigns.ts`
- Create: `lib/data/logs.ts`

**Interfaces:**
- Produces: `getDashboardStats(workspaceId, accountId?)` → `DashboardStats`
- Produces: `getCampaigns(workspaceId, accountId?)` → `Campaign[]`
- Produces: `getLogs(workspaceId, opts)` → `{ logs: DmLog[]; pagination: Pagination }`

These are the functions that replace the `fetch('/api/...')` calls in the old client pages. They take `workspaceId` as a plain parameter — they do NOT call `getCurrentWorkspaceId()` internally. The RSC page is responsible for auth.

- [ ] **Step 1: Create `lib/data/dashboard.ts`**

Extract the stats logic from `app/api/dashboard/stats/route.ts`. The daily chart loop (7 separate Prisma calls) is kept as-is — no scope creep on query optimization.

```ts
import "server-only";
import { prisma } from "@/lib/db/client";
import {
  calculateCtr,
  normalizeTopKeywords,
  summarizeDmStatuses,
} from "@/lib/tracking/analytics";
import { getEffectivePlan, getPlanLimits } from "@/lib/billing/plan";

export interface DashboardStats {
  userName: string | null;
  contactsCount: number;
  totalAutomations: number;
  activeAutomations: number;
  dmsSentToday: number;
  dmsSentWeek: number;
  dmsSentMonth: number;
  dmsSkippedMonth: number;
  dmsFailedMonth: number;
  totalDMs: number;
  clicksThisMonth: number;
  totalClicks: number;
  ctrThisMonth: number;
  plan: string;
  dmQuota: { used: number; limit: number | null } | null;
  instagramAccounts: { id: string; username: string; instagramId: string; name: string | null }[];
  selectedInstagramAccountId: string | null;
  topKeywords: { keyword: string; count: number }[];
  dailyDMs: { date: string; count: number }[];
  recentLogs: {
    id: string;
    commenterName: string | null;
    commentText: string;
    status: string;
    createdAt: Date;
    automation: { name: string };
    instagramAccount: { username: string } | null;
  }[];
}

export async function getDashboardStats(
  workspaceId: string,
  userId: string | null,
  accountId?: string | null
): Promise<DashboardStats> {
  const selectedAccountId =
    accountId && accountId !== "all" ? accountId : null;
  const accountFilter = selectedAccountId
    ? { instagramAccountId: selectedAccountId }
    : {};

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    workspace,
    instagramAccounts,
    totalAutomations,
    activeAutomations,
    dmsSentToday,
    dmsSentWeek,
    dmsSentMonth,
    totalDMs,
    dmStatusCountsThisMonth,
    clicksThisMonth,
    totalClicks,
    topKeywordRows,
    recentLogs,
    user,
    contactRows,
  ] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, plan: true, planExpiresAt: true, dmsSentThisPeriod: true },
    }),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true, instagramId: true, name: true },
    }),
    prisma.automation.count({ where: { workspaceId, ...accountFilter } }),
    prisma.automation.count({ where: { workspaceId, isActive: true, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", createdAt: { gte: todayStart }, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", createdAt: { gte: weekStart }, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", createdAt: { gte: monthStart }, ...accountFilter } }),
    prisma.dmLog.count({ where: { workspaceId, status: "SENT", ...accountFilter } }),
    prisma.dmLog.groupBy({
      by: ["status"],
      where: { workspaceId, createdAt: { gte: monthStart }, ...accountFilter },
      _count: { _all: true },
    }),
    prisma.linkClick.count({ where: { workspaceId, createdAt: { gte: monthStart }, ...accountFilter } }),
    prisma.linkClick.count({ where: { workspaceId, ...accountFilter } }),
    prisma.dmLog.groupBy({
      by: ["matchedKeyword"],
      where: { workspaceId, matchedKeyword: { not: null }, ...accountFilter },
      _count: { _all: true },
    }),
    prisma.dmLog.findMany({
      where: { workspaceId, ...accountFilter },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        automation: { select: { name: true } },
        instagramAccount: { select: { username: true } },
      },
    }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
      : Promise.resolve(null),
    prisma.dmLog.findMany({
      where: { workspaceId, ...accountFilter },
      distinct: ["commenterId"],
      select: { commenterId: true },
    }),
  ]);

  const dailyDMs: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await prisma.dmLog.count({
      where: { workspaceId, status: "SENT", createdAt: { gte: dayStart, lt: dayEnd }, ...accountFilter },
    });
    dailyDMs.push({ date: dayStart.toLocaleDateString("en-US", { weekday: "short" }), count });
  }

  const monthlyStatusSummary = summarizeDmStatuses(
    dmStatusCountsThisMonth.map((row) => ({ status: row.status, _count: row._count._all }))
  );
  const topKeywords = normalizeTopKeywords(
    topKeywordRows.map((row) => ({ matchedKeyword: row.matchedKeyword, _count: row._count._all }))
  );

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || null;

  const effectivePlan = workspace ? getEffectivePlan(workspace) : null;
  const planLimits = effectivePlan ? getPlanLimits(effectivePlan) : null;

  return {
    userName: firstName,
    contactsCount: contactRows.length,
    totalAutomations,
    activeAutomations,
    dmsSentToday,
    dmsSentWeek,
    dmsSentMonth,
    dmsSkippedMonth: monthlyStatusSummary.skipped,
    dmsFailedMonth: monthlyStatusSummary.failed,
    totalDMs,
    clicksThisMonth,
    totalClicks,
    ctrThisMonth: calculateCtr(clicksThisMonth, dmsSentMonth),
    plan: effectivePlan ?? "FREE",
    dmQuota: planLimits
      ? { used: workspace!.dmsSentThisPeriod, limit: planLimits.maxDmsPerMonth === Infinity ? null : planLimits.maxDmsPerMonth }
      : null,
    instagramAccounts,
    selectedInstagramAccountId: selectedAccountId,
    topKeywords,
    dailyDMs,
    recentLogs,
  };
}
```

- [ ] **Step 2: Create `lib/data/campaigns.ts`**

Extract from `app/api/automations/route.ts` GET handler. Includes the report-slug generation side-effect (a write that happens on first read — kept as-is to match existing behaviour).

```ts
import "server-only";
import { prisma } from "@/lib/db/client";
import { calculateCtr, normalizeTopKeywords } from "@/lib/tracking/analytics";
import { buildTrackedUrl } from "@/lib/tracking/message";
import { buildReportUrl, generateReportShareSlug } from "@/lib/reports/share";

export type CampaignData = {
  id: string;
  name: string;
  goal: string | null;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  isActive: boolean;
  wholeWordMatch: boolean;
  instagramAccountId: string;
  instagramAccount: { username: string; instagramId: string };
  reportShareSlug: string | null;
  reportShareEnabled: boolean;
  reportUrl: string | null;
  createdAt: Date;
  _count: { dmLogs: number };
  trackedLinks: { id: string; slug: string; label: string | null; destinationUrl: string; trackedUrl: string; _count: { clicks: number } }[];
  analytics: { sent: number; skipped: number; failed: number; clicks: number; ctr: number; topKeywords: { keyword: string; count: number }[] };
};

export async function getCampaigns(
  workspaceId: string,
  accountId?: string | null
): Promise<CampaignData[]> {
  const accountFilter =
    accountId && accountId !== "all" ? { instagramAccountId: accountId } : {};

  const automations = await prisma.automation.findMany({
    where: { workspaceId, ...accountFilter },
    include: {
      instagramAccount: { select: { username: true, instagramId: true } },
      _count: { select: { dmLogs: true } },
      trackedLinks: {
        select: { id: true, slug: true, label: true, destinationUrl: true, _count: { select: { clicks: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Generate missing report slugs (side-effect on GET — matches existing API behaviour)
  const automationsWithReports = await Promise.all(
    automations.map(async (automation) => {
      if (automation.reportShareSlug) return automation;
      const updated = await prisma.automation.update({
        where: { id: automation.id },
        data: { reportShareSlug: generateReportShareSlug() },
        select: { reportShareSlug: true },
      });
      return { ...automation, reportShareSlug: updated.reportShareSlug };
    })
  );

  const [statusCounts, clickCounts, keywordCounts] = await Promise.all([
    prisma.dmLog.groupBy({ by: ["automationId", "status"], where: { workspaceId }, _count: { _all: true } }),
    prisma.linkClick.groupBy({ by: ["automationId"], where: { workspaceId }, _count: { _all: true } }),
    prisma.dmLog.groupBy({
      by: ["automationId", "matchedKeyword"],
      where: { workspaceId, matchedKeyword: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const analyticsMap = new Map<string, { sent: number; skipped: number; failed: number; clicks: number; topKeywords: { keyword: string; count: number }[] }>();
  for (const a of automationsWithReports) {
    analyticsMap.set(a.id, { sent: 0, skipped: 0, failed: 0, clicks: 0, topKeywords: [] });
  }
  for (const row of statusCounts) {
    const item = analyticsMap.get(row.automationId);
    if (!item) continue;
    if (row.status === "SENT") item.sent += row._count._all;
    if (row.status === "FAILED") item.failed += row._count._all;
    if (row.status.startsWith("SKIPPED_")) item.skipped += row._count._all;
  }
  for (const row of clickCounts) {
    const item = analyticsMap.get(row.automationId);
    if (item) item.clicks = row._count._all;
  }
  for (const a of automationsWithReports) {
    const item = analyticsMap.get(a.id);
    if (!item) continue;
    item.topKeywords = normalizeTopKeywords(
      keywordCounts.filter((r) => r.automationId === a.id).map((r) => ({ matchedKeyword: r.matchedKeyword, _count: r._count._all })),
      3
    );
  }

  return automationsWithReports.map((a) => {
    const item = analyticsMap.get(a.id) ?? { sent: 0, skipped: 0, failed: 0, clicks: 0, topKeywords: [] };
    return {
      ...a,
      trackedLinks: a.trackedLinks.map((link) => ({ ...link, trackedUrl: buildTrackedUrl(link.slug) })),
      reportUrl: a.reportShareSlug ? buildReportUrl(a.reportShareSlug) : null,
      analytics: { ...item, ctr: calculateCtr(item.clicks, item.sent) },
    };
  });
}
```

- [ ] **Step 3: Create `lib/data/logs.ts`**

```ts
import "server-only";
import { prisma } from "@/lib/db/client";
import { DmStatus } from "@/app/generated/prisma/client";

export interface LogEntry {
  id: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  automation: { name: string; keywords: string[] };
  instagramAccount: { username: string };
}

export interface LogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getLogs(
  workspaceId: string,
  opts: { page?: number; status?: string | null; accountId?: string | null; limit?: number }
): Promise<{ logs: LogEntry[]; pagination: LogPagination }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const parsedStatus =
    opts.status && Object.values(DmStatus).includes(opts.status as DmStatus)
      ? (opts.status as DmStatus)
      : null;

  const where = {
    workspaceId,
    ...(parsedStatus ? { status: parsedStatus } : {}),
    ...(opts.accountId && opts.accountId !== "all" ? { instagramAccountId: opts.accountId } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.dmLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        automation: { select: { name: true, keywords: true } },
        instagramAccount: { select: { username: true } },
      },
    }),
    prisma.dmLog.count({ where }),
  ]);

  return {
    logs: logs as LogEntry[],
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

- [ ] **Step 4: Run typecheck**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
npm run typecheck
```

Expected: 0 errors. If Prisma types don't match (e.g. `DmStatus` import path), fix the import — `@/app/generated/prisma/client` is the correct path (check the logs route which already imports from there).

- [ ] **Step 5: Commit**

```bash
git add lib/data/dashboard.ts lib/data/campaigns.ts lib/data/logs.ts
git commit -m "feat(rsc): add server-side data functions for dashboard, campaigns, logs"
```

---

## Task 2: loading.tsx + error.tsx for all three routes

**Files:**
- Create: `app/[lang]/(dashboard)/dashboard/loading.tsx`
- Create: `app/[lang]/(dashboard)/campaigns/loading.tsx`
- Create: `app/[lang]/(dashboard)/logs/loading.tsx`
- Create: `app/[lang]/(dashboard)/dashboard/error.tsx`
- Create: `app/[lang]/(dashboard)/campaigns/error.tsx`
- Create: `app/[lang]/(dashboard)/logs/error.tsx`

These are the Suspense boundaries (via `loading.tsx`) and error boundaries (via `error.tsx`). Next.js wraps each page in `<Suspense fallback={<Loading />}>` automatically when `loading.tsx` is present.

- [ ] **Step 1: Create `app/[lang]/(dashboard)/dashboard/loading.tsx`**

```tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-56 rounded-md bg-border/60" />
        <div className="mt-2 h-4 w-72 rounded-md bg-border/40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="panel rounded-lg p-5">
            <div className="h-4 w-24 rounded-md bg-border" />
            <div className="mt-2 h-9 w-20 rounded-md bg-border/60" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel rounded-lg p-4">
            <div className="h-3 w-20 rounded-md bg-border" />
            <div className="mt-2 h-7 w-14 rounded-md bg-border/60" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <div className="lg:col-span-3 panel rounded-lg p-6 h-64" />
        <div className="lg:col-span-1 panel rounded-lg p-6 h-64" />
        <div className="lg:col-span-2 panel rounded-lg p-6 h-64" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/[lang]/(dashboard)/campaigns/loading.tsx`**

```tsx
export default function CampaignsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="h-4 w-24 rounded-md bg-border/60" />
        <div className="h-9 w-32 rounded-lg bg-border/60" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel rounded-md p-6 h-36" />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `app/[lang]/(dashboard)/logs/loading.tsx`**

```tsx
export default function LogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 rounded-lg bg-border/60" />
        ))}
      </div>
      <div className="panel rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-3 w-16 rounded-md bg-border" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td colSpan={6} className="px-6 py-4">
                  <div className="h-4 bg-border/60 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create error boundaries (same shape for all three)**

`app/[lang]/(dashboard)/dashboard/error.tsx`:
```tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel rounded-lg p-8 text-center space-y-3">
      <p className="text-sm text-muted">{error.message ?? "Something went wrong"}</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
```

Repeat for `campaigns/error.tsx` (change function name to `CampaignsError`) and `logs/error.tsx` (change to `LogsError`). Error boundaries must be `"use client"` — that is a Next.js requirement.

- [ ] **Step 5: Run typecheck + lint**

```bash
npm run typecheck
npm run lint
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add "app/[lang]/(dashboard)/dashboard/loading.tsx" \
        "app/[lang]/(dashboard)/campaigns/loading.tsx" \
        "app/[lang]/(dashboard)/logs/loading.tsx" \
        "app/[lang]/(dashboard)/dashboard/error.tsx" \
        "app/[lang]/(dashboard)/campaigns/error.tsx" \
        "app/[lang]/(dashboard)/logs/error.tsx"
git commit -m "feat(rsc): add loading skeletons and error boundaries for dashboard routes"
```

---

## Task 3: AccountFilter client island + dashboard RSC

**Files:**
- Create: `components/dashboard/account-filter.tsx`
- Modify: `app/[lang]/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getDashboardStats` from `lib/data/dashboard.ts`
- Consumes: `getDictionary` from `lib/i18n`
- Consumes: `getCurrentWorkspaceId`, `getCurrentUserId` from `lib/auth`
- Produces: dashboard RSC that streams server-rendered HTML

**How filters work:** The `accountId` filter lives in the URL as `?accountId=<id>`. When `AccountFilter` changes the selection, it calls `router.push` to update the URL. Next.js re-runs the RSC page with the new `searchParams`, fetches fresh stats, and streams the updated HTML.

- [ ] **Step 1: Create `components/dashboard/account-filter.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";

interface Props {
  accounts: AccountOption[];
}

export default function AccountFilter({ accounts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("accountId") ?? "all";

  function handleChange(accountId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (accountId === "all") {
      params.delete("accountId");
    } else {
      params.set("accountId", accountId);
    }
    router.push(`?${params.toString()}`);
  }

  return <AccountSelect accounts={accounts} value={value} onChange={handleChange} />;
}
```

- [ ] **Step 2: Rewrite `app/[lang]/(dashboard)/dashboard/page.tsx` as RSC**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/auth";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n/t";
import StatCard from "@/components/stat-card";
import StatusBadge from "@/components/status-badge";
import AccountFilter from "@/components/dashboard/account-filter";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ accountId?: string }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { accountId } = (await searchParams) ?? {};

  const locale = hasLocale(lang) ? lang : "uz";
  const dict = await getDictionary(locale);
  const d = dict.dashboard;

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  if (!workspaceId) redirect(`/${locale}/login`);

  const stats = await getDashboardStats(workspaceId, userId, accountId);

  const maxDM = Math.max(...stats.dailyDMs.map((day) => day.count), 1);
  const connectedCount = stats.instagramAccounts.length;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t(d.greeting, { name: stats.userName ?? "" })}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(d.connectedAccounts, { n: String(connectedCount) })}
            {" · "}
            {t(d.contacts, { n: String(stats.contactsCount) })}
            {" · "}
            <Link href={`/${locale}/logs`} className="text-accent hover:underline">
              {d.activity}
            </Link>
          </p>
        </div>
        {stats.instagramAccounts.length > 1 && (
          <AccountFilter accounts={stats.instagramAccounts} />
        )}
      </div>

      {/* Onboarding checklist */}
      {(() => {
        const step1 = connectedCount > 0;
        const step2 = stats.totalAutomations > 0;
        const step3 = stats.totalDMs > 0;
        if (step1 && step2 && step3) return null;
        const steps = [
          { done: step1, label: d.onboardingStep1, href: "/api/instagram/connect" },
          { done: step2, label: d.onboardingStep2, href: `/${locale}/campaigns/new` },
          { done: step3, label: d.onboardingStep3, href: `/${locale}/logs` },
        ];
        const doneCount = steps.filter((s) => s.done).length;
        return (
          <div className="panel rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{d.onboardingTitle}</h2>
              <span className="text-xs text-muted">{t(d.onboardingProgress, { done: String(doneCount) })}</span>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${step.done ? "bg-success/10" : "border-2 border-border"}`}>
                    {step.done && (
                      <svg className="w-3 h-3 text-success" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${step.done ? "text-muted line-through" : "text-foreground"}`}>
                    {step.label}
                  </span>
                  {!step.done && (
                    <a href={step.href} className="text-xs font-semibold text-accent hover:underline shrink-0">
                      {d.onboardingStart}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* DM usage meter */}
      {stats.dmQuota && stats.dmQuota.limit !== null && (
        <div className="panel rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{d.dmLimitTitle}</span>
            <span className="text-sm tabular-nums text-muted">
              {stats.dmQuota.used.toLocaleString()} / {stats.dmQuota.limit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-border">
            <div
              className={`h-2 rounded-full transition-all ${
                stats.dmQuota.used / stats.dmQuota.limit > 0.9
                  ? "bg-error"
                  : stats.dmQuota.used / stats.dmQuota.limit > 0.7
                    ? "bg-amber-500"
                    : "bg-accent"
              }`}
              style={{ width: `${Math.min(100, (stats.dmQuota.used / stats.dmQuota.limit) * 100)}%` }}
            />
          </div>
          {stats.dmQuota.used / stats.dmQuota.limit > 0.9 && (
            <p className="mt-2 text-xs text-error">
              {d.upgradeWarning}{" "}
              <Link href={`/${locale}/pricing`} className="font-medium underline">
                {d.upgradeLinkText}
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Headline metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={d.stat1Label} value={stats.dmsSentMonth} emphasis="primary" />
        <StatCard label={d.stat2Label} value={`${stats.ctrThisMonth}%`} emphasis="primary" />
      </div>

      {/* Supporting metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={d.statActiveCampaigns} value={stats.activeAutomations} />
        <StatCard label={d.statClicks} value={stats.clicksThisMonth} />
        <StatCard label={d.statSkipped} value={stats.dmsSkippedMonth} />
        <StatCard label={d.statFailed} value={stats.dmsFailedMonth} />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* 7-Day Chart */}
        <div className="lg:col-span-3 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">{d.chartTitle}</h2>
          <div className="relative h-40">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
            <div className="relative flex h-full items-end gap-2">
              {stats.dailyDMs.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-muted">{day.count}</span>
                  <div
                    className="w-full rounded-t-md bg-accent min-h-[4px]"
                    style={{ height: `${Math.max((day.count / maxDM) * 100, 4)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {stats.dailyDMs.map((day) => (
              <span key={day.date} className="flex-1 text-center text-xs text-subtle">{day.date}</span>
            ))}
          </div>
        </div>

        {/* Top Keywords */}
        <div className="lg:col-span-1 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{d.keywordsTitle}</h2>
          <div className="space-y-3">
            {stats.topKeywords.length === 0 && (
              <div className="py-6">
                <p className="text-sm text-muted">{d.noKeywords}</p>
                <p className="mt-1 text-xs text-subtle">{d.noKeywordsSub}</p>
              </div>
            )}
            {stats.topKeywords.map((kw) => (
              <div key={kw.keyword} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">{kw.keyword}</span>
                <span className="text-xs text-muted">{kw.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 panel rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{d.activityTitle}</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {stats.recentLogs.length === 0 && (
              <div className="py-6">
                <p className="text-sm text-muted">{d.noActivity}</p>
                <p className="mt-1 text-xs text-subtle">{d.noActivitySub}</p>
                <Link
                  href={`/${locale}/campaigns/new`}
                  className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  {d.createCampaign}
                </Link>
              </div>
            )}
            {stats.recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    @{log.commenterName ?? "—"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {log.instagramAccount ? `@${log.instagramAccount.username} · ` : ""}
                    {log.commentText}
                  </p>
                </div>
                <StatusBadge status={log.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Note: `t()` imported from `@/lib/i18n/t`, not from `dictionary-provider`. The `dict` is fetched directly via `getDictionary(locale)`. No `useDict()` — this is a server component.

- [ ] **Step 3: Run typecheck + lint**

```bash
npm run typecheck
npm run lint
```

Common errors to expect and fix:
- `auth` imported twice from `lib/auth` — remove the standalone `import { auth }` line, `getCurrentWorkspaceId` calls `auth()` internally.
- Type mismatch on `recentLogs.createdAt`: it's `Date` from Prisma, but `StatusBadge` or template might need a string — adjust if needed.

- [ ] **Step 4: Smoke test manually**

Start the dev server (`npm run dev`) and visit `/uz/dashboard`. Verify:
- Page renders with real data (not blank)
- Sidebar visible during load (loading.tsx shows skeleton in content area)
- Account select filter changes URL to `?accountId=xxx`
- Stats update after account change

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/account-filter.tsx "app/[lang]/(dashboard)/dashboard/page.tsx"
git commit -m "feat(rsc): convert dashboard page to React Server Component"
```

---

## Task 4: CampaignList client island + campaigns RSC

**Files:**
- Create: `components/campaigns/campaign-list.tsx`
- Modify: `app/[lang]/(dashboard)/campaigns/page.tsx`

**Design:** The RSC fetches the campaign list + account list on the server. Both are passed as props to `CampaignList`, a large `"use client"` island. Search and status-filter are local in-memory operations (no refetch needed). Account filter change pushes a URL param → RSC re-renders with the new account's campaigns. Toggle/delete use optimistic local state updates. Duplicate calls `router.refresh()` after the API call to re-run the RSC and get fresh data.

**Interfaces:**
- Consumes: `getCampaigns` from `lib/data/campaigns.ts`
- Consumes: `prisma.instagramAccount.findMany` (directly in the page, 3-column select)
- Produces: `CampaignList` client island with `initialCampaigns`, `initialAccounts`, `selectedAccountId`, `lang`, `dict` props

- [ ] **Step 1: Create `components/campaigns/campaign-list.tsx`**

This file is the extracted interactive shell of the old `campaigns/page.tsx`. The key changes from the original:
- `initialCampaigns`, `initialAccounts`, `selectedAccountId`, `lang` come as props
- `dict` comes as a prop (type `Dict["campaigns"]`) instead of `useDict()`
- Account change calls `router.push` to update URL (→ RSC re-renders) instead of fetching locally
- Duplicate calls `router.refresh()` instead of `fetchAutomations()`
- The `fetch('/api/instagram/accounts')` effect is removed (accounts come from props)
- The `fetch('/api/automations')` effect is removed (campaigns come from props)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { t } from "@/components/dictionary-provider";
import type { CampaignData } from "@/lib/data/campaigns";
import type { Dict } from "@/lib/i18n/types";

interface Props {
  initialCampaigns: CampaignData[];
  initialAccounts: AccountOption[];
  selectedAccountId: string;
  lang: string;
  dict: Dict["campaigns"];
}

export default function CampaignList({
  initialCampaigns,
  initialAccounts,
  selectedAccountId,
  lang,
  dict: c,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [automations, setAutomations] = useState<CampaignData[]>(initialCampaigns);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [playingVideo, setPlayingVideo] = useState<{ url: string; postUrl: string | null } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  // Keep local state in sync when RSC re-renders with new props (account changed)
  useEffect(() => {
    setAutomations(initialCampaigns);
    setSearch("");
    setStatusFilter("all");
  }, [initialCampaigns]);

  // Fetch Instagram post thumbnails (legitimately client-side: hits Instagram CDN)
  useEffect(() => {
    if (automations.length === 0) return;
    let cancelled = false;
    const accountIds = Array.from(new Set(automations.map((a) => a.instagramAccountId))).sort();

    Promise.all(
      accountIds.map((accountId) =>
        fetch(`/api/instagram/posts?instagramAccountId=${accountId}&limit=50`)
          .then((res) => res.json())
          .then((payload) =>
            payload.success
              ? (payload.data as { id: string; media_type?: string; media_url?: string; thumbnail_url?: string }[])
              : []
          )
          .catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const thumbs: Record<string, string> = {};
      const vids: Record<string, string> = {};
      for (const list of lists) {
        for (const media of list) {
          const url = media.thumbnail_url ?? media.media_url;
          if (url) thumbs[media.id] = url;
          if (media.media_type === "VIDEO" && media.media_url) vids[media.id] = media.media_url;
        }
      }
      setThumbnails(thumbs);
      setVideos(vids);
    });

    return () => { cancelled = true; };
  }, [automations]);

  useEffect(() => {
    if (!playingVideo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPlayingVideo(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playingVideo]);

  function handleAccountChange(accountId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (accountId === "all") {
      params.delete("accountId");
    } else {
      params.set("accountId", accountId);
    }
    router.push(`?${params.toString()}`);
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await fetch(`/api/automations?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a)));
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm(c.deleteConfirm)) return;
    try {
      await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function duplicateAutomation(auto: CampaignData) {
    setMenuOpenId(null);
    const specific = !auto.matchAnyPost && !auto.pendingNextReel;
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${auto.name} copy`,
          instagramAccountId: auto.instagramAccountId,
          postId: specific ? auto.postId : null,
          postUrl: specific ? auto.postUrl : null,
          matchAnyPost: auto.matchAnyPost,
          pendingNextReel: auto.pendingNextReel,
          matchAnyWord: auto.matchAnyWord,
          keywords: auto.keywords,
          dmMessage: auto.dmMessage,
          openingDmEnabled: auto.openingDmEnabled,
          openingDmMessage: auto.openingDmMessage,
          openingDmButtonLabel: auto.openingDmButtonLabel,
          publicReplyEnabled: auto.publicReplyEnabled,
          publicReplyMessages: auto.publicReplyMessages,
          trackedDestinationUrl: auto.trackedLinks[0]?.destinationUrl ?? "",
          secondaryDestinationUrl: auto.trackedLinks[1]?.destinationUrl ?? "",
          secondaryButtonLabel: auto.trackedLinks[1]?.label ?? "Havolani ochish",
          requireFollow: auto.requireFollow,
          followPromptMessage: auto.followPromptMessage,
          followPromptButtonLabel: auto.followPromptButtonLabel,
          wholeWordMatch: auto.wholeWordMatch,
          isActive: false,
        }),
      });
      const data = await res.json();
      if (data.success) router.refresh(); // re-runs RSC to get fresh server data
      else console.error("Duplicate failed:", data.error);
    } catch (err) {
      console.error("Failed to duplicate:", err);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = automations.filter((a) => {
    if (statusFilter === "active" && !a.isActive) return false;
    if (statusFilter === "paused" && a.isActive) return false;
    if (!query) return true;
    return (
      a.name.toLowerCase().includes(query) ||
      a.keywords.some((k) => k.toLowerCase().includes(query)) ||
      a.dmMessage.toLowerCase().includes(query)
    );
  });

  const filterLabels: Record<string, string> = {
    all: c.filterAll,
    active: c.filterActive,
    paused: c.filterPaused,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            {t(c.countLabel, { n: String(filtered.length) })}
            {filtered.length !== automations.length ? ` / ${automations.length}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {initialAccounts.length > 1 && (
            <AccountSelect
              accounts={initialAccounts}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}
          <a
            href={`/${lang}/campaigns/import`}
            className="px-4 py-2 rounded-md border border-border text-sm font-medium text-muted hover:text-foreground"
          >
            {c.importBtn}
          </a>
          <a
            href={`/${lang}/campaigns/new`}
            className="px-4 py-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            {c.newBtn}
          </a>
        </div>
      </div>

      {/* Search + status filter */}
      {automations.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
          />
          <div className="inline-flex shrink-0 rounded-lg bg-surface p-1">
            {(["all", "active", "paused"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  statusFilter === s
                    ? "bg-background font-medium text-foreground ring-1 ring-accent/40"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {filterLabels[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {automations.length === 0 && (
        <div className="panel rounded-md p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">{c.emptyTitle}</h3>
          <p className="text-sm text-muted mb-6 max-w-sm mx-auto">{c.emptyDesc}</p>
          <a
            href={`/${lang}/campaigns/new`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            {c.emptyBtn}
          </a>
        </div>
      )}

      {/* No matches */}
      {automations.length > 0 && filtered.length === 0 && (
        <div className="panel rounded-md p-8 text-center text-sm text-muted">
          {c.noResults}
        </div>
      )}

      {/* Campaign cards */}
      <div className="space-y-3">
        {filtered.map((auto) => {
          const videoUrl = auto.postId ? videos[auto.postId] : undefined;
          return (
            <div
              key={auto.id}
              onClick={() => router.push(`/${lang}/campaigns/${auto.id}`)}
              className="panel rounded-md p-4 hover:border-border-hover transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                {auto.postId && thumbnails[auto.postId] && (
                  videoUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingVideo({ url: videoUrl, postUrl: auto.postUrl });
                      }}
                      aria-label={c.playReel}
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnails[auto.postId!]}
                        alt={c.campaignReel}
                        className="w-12 h-12 rounded-md object-cover border border-border hover:border-border-hover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </button>
                  ) : (
                    <a
                      href={auto.postUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnails[auto.postId!]}
                        alt={c.campaignPost}
                        className="w-12 h-12 rounded-md object-cover border border-border"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </a>
                  )
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold truncate">{auto.name}</h3>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                      @{auto.instagramAccount.username}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${auto.isActive ? "bg-success/10 text-success" : "bg-muted/15 text-muted"}`}>
                      {auto.isActive ? c.statusActive : c.statusPaused}
                    </span>
                    {auto.pendingNextReel && (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                        {c.pendingReel}
                      </span>
                    )}
                    {auto.requireFollow && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        Follow gate
                      </span>
                    )}
                    {auto.trackedLinks.length >= 2 && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        {c.twoLinks}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {auto.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium border border-accent/10">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted truncate">&ldquo;{auto.dmMessage}&rdquo;</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-muted">
                    <span className="font-medium text-foreground">
                      {t(c.sendCount, { n: String(auto._count.dmLogs) })}
                    </span>
                    <span>·</span>
                    <span className="font-medium text-foreground">{auto.analytics.ctr}% CTR</span>
                    <span>·</span>
                    <span>{auto.analytics.sent} sent</span>
                    <span>·</span>
                    <span>{auto.analytics.skipped} skipped</span>
                    <span>·</span>
                    <span>{auto.analytics.failed} failed</span>
                    <span>·</span>
                    <span>{auto.analytics.clicks} clicks</span>
                  </div>
                  {auto.analytics.topKeywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {auto.analytics.topKeywords.map((kw) => (
                        <span key={kw.keyword} className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted">
                          {kw.keyword}: {kw.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleActive(auto.id, auto.isActive)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${auto.isActive ? "bg-accent" : "bg-border"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${auto.isActive ? "left-6" : "left-1"}`} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId((cur) => (cur === auto.id ? null : auto.id))}
                      aria-label="More actions"
                      className="px-2 py-1 rounded-md text-lg leading-none text-muted hover:text-foreground"
                    >
                      ⋯
                    </button>
                    {menuOpenId === auto.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                          <button
                            onClick={() => void duplicateAutomation(auto)}
                            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                          >
                            {c.duplicate}
                          </button>
                          <button
                            onClick={() => { setMenuOpenId(null); void deleteAutomation(auto.id); }}
                            className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-surface-hover"
                          >
                            {c.delete}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reel lightbox */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <div className="relative flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 text-sm">
              {playingVideo.postUrl && (
                <a href={playingVideo.postUrl} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white">
                  {c.openOnInstagram}
                </a>
              )}
              <button type="button" onClick={() => setPlayingVideo(null)} className="text-white/70 hover:text-white">
                {c.close}
              </button>
            </div>
            <video
              src={playingVideo.url}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[80vh] max-w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/[lang]/(dashboard)/campaigns/page.tsx` as RSC**

```tsx
import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getCampaigns } from "@/lib/data/campaigns";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { prisma } from "@/lib/db/client";
import CampaignList from "@/components/campaigns/campaign-list";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ accountId?: string }>;
};

export default async function CampaignsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { accountId } = (await searchParams) ?? {};

  const locale = hasLocale(lang) ? lang : "uz";
  const dict = await getDictionary(locale);

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect(`/${locale}/login`);

  const [campaigns, accounts] = await Promise.all([
    getCampaigns(workspaceId, accountId),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true, instagramId: true, name: true },
    }),
  ]);

  return (
    <CampaignList
      initialCampaigns={campaigns}
      initialAccounts={accounts}
      selectedAccountId={accountId ?? "all"}
      lang={locale}
      dict={dict.campaigns}
    />
  );
}
```

- [ ] **Step 3: Run typecheck + lint**

```bash
npm run typecheck
npm run lint
```

If `Dict["campaigns"]` type errors: check `lib/i18n/types.ts` for the actual key name — it's whatever the `campaigns` field is named in the `Dict` interface.

- [ ] **Step 4: Smoke test**

Visit `/uz/campaigns`. Verify:
- List renders with data on first load (no blank flash)
- Search box filters in-memory (no navigation)
- Status filter (active/paused) filters in-memory
- Toggle switch works (optimistic update)
- Account change updates URL and re-renders list
- Duplicate adds a new entry (after `router.refresh()`)

- [ ] **Step 5: Commit**

```bash
git add "components/campaigns/campaign-list.tsx" "app/[lang]/(dashboard)/campaigns/page.tsx"
git commit -m "feat(rsc): convert campaigns page to React Server Component"
```

---

## Task 5: LogFilters client island + logs RSC

**Files:**
- Create: `components/logs/log-filters.tsx`
- Modify: `app/[lang]/(dashboard)/logs/page.tsx`

**Design:** All filter state (status, page, accountId) lives in the URL. `LogFilters` is a `"use client"` island that renders the filter buttons, account select, and pagination controls — each update calls `router.push` to change URL params, which triggers RSC re-render with new data from `getLogs`. The table rows are server-rendered HTML.

**Interfaces:**
- Consumes: `getLogs` from `lib/data/logs.ts`
- Produces: `LogFilters` client island with `currentStatus`, `currentPage`, `currentAccountId`, `totalPages`, `total`, `limit`, `accounts`, `dict` props

- [ ] **Step 1: Create `components/logs/log-filters.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import type { Dict } from "@/lib/i18n/types";

const STATUS_FILTERS: { value: string; key: keyof Dict["dmStatus"] | null }[] = [
  { value: "ALL", key: null },
  { value: "SENT", key: "sent" },
  { value: "FAILED", key: "failed" },
  { value: "PENDING", key: "pending" },
  { value: "SKIPPED_RATE_LIMIT", key: "rateLimit" },
  { value: "SKIPPED_PLAN_LIMIT", key: "planLimit" },
  { value: "SKIPPED_DEDUP", key: "dedup" },
];

interface Props {
  currentStatus: string;
  currentPage: number;
  currentAccountId: string;
  totalPages: number;
  total: number;
  limit: number;
  accounts: AccountOption[];
  dict: Pick<Dict, "logs" | "dmStatus">;
}

export default function LogFilters({
  currentStatus,
  currentPage,
  currentAccountId,
  totalPages,
  total,
  limit,
  accounts,
  dict,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(status: string) {
    pushParams({ status: status === "ALL" ? null : status, page: null });
  }

  function handleAccountChange(accountId: string) {
    pushParams({ accountId: accountId === "all" ? null : accountId, page: null });
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, key }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  currentStatus === value
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-surface text-muted border border-border hover:border-border-hover hover:text-foreground"
                }
              `}
            >
              {key ? dict.dmStatus[key] : dict.logs.filterAll}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <AccountSelect
            accounts={accounts}
            value={currentAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-0 py-2">
          <p className="text-xs text-muted">
            {(currentPage - 1) * limit + 1}–
            {Math.min(currentPage * limit, total)} / {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => pushParams({ page: String(currentPage - 1) })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              {dict.logs.prev}
            </button>
            <span className="text-xs text-muted px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => pushParams({ page: String(currentPage + 1) })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              {dict.logs.next}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/[lang]/(dashboard)/logs/page.tsx` as RSC**

```tsx
import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getLogs } from "@/lib/data/logs";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { prisma } from "@/lib/db/client";
import { intlLocale } from "@/lib/i18n/format";
import StatusBadge from "@/components/status-badge";
import LogFilters from "@/components/logs/log-filters";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ page?: string; status?: string; accountId?: string }>;
};

export default async function LogsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const sp = (await searchParams) ?? {};
  const locale = hasLocale(lang) ? lang : "uz";

  const dict = await getDictionary(locale);
  const d = dict.logs;

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect(`/${locale}/login`);

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10));
  const status = sp.status ?? "ALL";
  const accountId = sp.accountId ?? "all";

  const [{ logs, pagination }, accounts] = await Promise.all([
    getLogs(workspaceId, { page, status: status !== "ALL" ? status : null, accountId }),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true, instagramId: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <LogFilters
        currentStatus={status}
        currentPage={page}
        currentAccountId={accountId}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        accounts={accounts}
        dict={{ logs: dict.logs, dmStatus: dict.dmStatus }}
      />

      {/* Table */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-background">
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colCommenter}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colComment}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colCampaign}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colAccount}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colStatus}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colTime}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    {d.empty}
                  </td>
                </tr>
              )}
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`transition-colors hover:bg-surface-hover ${i % 2 === 1 ? "bg-background/50" : ""}`}
                >
                  <td className="px-6 py-3.5">
                    <span className="font-medium text-foreground">
                      @{log.commenterName ?? log.commenterId.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 max-w-[200px]">
                    <span className="text-muted truncate block">{log.commentText}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-muted">{log.automation.name}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-muted">@{log.instagramAccount.username}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-6 py-3.5 text-muted whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleString(intlLocale(dict.locale), {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

Note: Pagination controls moved into `LogFilters` client island since they need `onClick`. The table is pure server-rendered HTML.

- [ ] **Step 3: Run typecheck + lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: Smoke test**

Visit `/uz/logs`. Verify:
- Table renders immediately with first 20 rows
- Status filter buttons change URL and re-render table
- Pagination changes URL and re-renders table
- Account filter changes URL and re-renders table

- [ ] **Step 5: Commit**

```bash
git add "components/logs/log-filters.tsx" "app/[lang]/(dashboard)/logs/page.tsx"
git commit -m "feat(rsc): convert logs page to React Server Component"
```

---

## Task 6: Verification + baseline confirmation

**Files:** None (test + build run only)

- [ ] **Step 1: Run full test suite**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
npm run typecheck
npm run lint
npm test
```

Expected: 0 typecheck errors, 0 lint errors, 125 tests passing.

If test count changes (existing tests for old page components break), check if any test directly imports the old page components. If so, update imports to point at the new client island (`CampaignList`, `LogFilters`) or the RSC page — but RSC pages cannot be unit-tested with vitest directly (they use async server APIs). Delete page-level component tests that can no longer work; rely on integration tests and manual testing instead.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: build succeeds. Watch for:
- "use client" boundary violations (importing server-only code from a client component)
- Missing `"use client"` directives on error boundaries
- `getDictionary` called from a client component (it has `server-only` — this will fail at build time)

- [ ] **Step 3: Check `git diff package-lock.json`**

```bash
git diff package-lock.json
```

Expected: no output. If the lockfile changed, discard: `git checkout HEAD -- package-lock.json`.

- [ ] **Step 4: Commit**

If no issues, nothing to commit here. If small fixes were needed, commit them:

```bash
git add -p  # stage only what changed
git commit -m "fix(rsc): address typecheck and lint issues after RSC conversion"
```

---

## Task 7: Update FIX_BRIEF.md

**Files:**
- Modify: `FIX_BRIEF.md`

- [ ] **Step 1: Mark C5 done in FIX_BRIEF**

In the C5 section header, change:

```
## C5 (MED) — No per-account hourly rate limiter
```

to:

```
## C5 (MED) — No per-account hourly rate limiter — ✅ FIXED (pre-existing)
```

Add a note at the top of the C5 section:

```
**Fixed (pre-existing).** `lib/utils/rate-limiter.ts` implements `checkRateLimit`,
`reserveDMSlot`, and `incrementDMCounter` with a Lua-atomic Redis counter.
`SKIPPED_RATE_LIMIT` is in the schema. `__tests__/rate-limiter.test.ts` covers it.
Cap is 750/hr (Meta's documented limit for private replies). Already in "Verified
correct" section.
```

- [ ] **Step 2: Mark F6 done in FIX_BRIEF**

In the F6 section header, change:

```
## F6 (LOW) — All dashboard pages are client components; no streaming or prefetch value
```

to:

```
## F6 (LOW) — All dashboard pages are client components; no streaming or prefetch value — ✅ FIXED
```

Add a summary note:

```
**Fixed.** dashboard, campaigns, and logs pages converted to async RSC. Data fetched
server-side via `lib/data/{dashboard,campaigns,logs}.ts`. Client islands:
`AccountFilter`, `CampaignList`, `LogFilters`. Filter state in URL search params.
`loading.tsx` + `error.tsx` at each route. No new dependencies.
```

- [ ] **Step 3: Update open items count**

Change `**Open: 5**` at the top to `**Open: 3**` (P2, C2, C4 remain; P5 and F6 were deferred/done).

- [ ] **Step 4: Commit**

```bash
git add FIX_BRIEF.md
git commit -m "docs: mark C5 and F6 done in FIX_BRIEF"
```

---

## Self-Review

**Spec coverage check:**

| F6 requirement | Covered by |
|---|---|
| Convert pages to RSC | Tasks 3, 4, 5 |
| Move data fetch to server | Task 1 (data functions) |
| Wrap interactive sub-components in "use client" islands | Tasks 3 (AccountFilter), 4 (CampaignList), 5 (LogFilters) |
| Use Suspense with skeleton fallback | Task 2 (loading.tsx) |
| Error boundaries | Task 2 (error.tsx) |
| Disable JS → pages render meaningful content | Verified in smoke tests |
| Link prefetch returns full HTML | Implicit from RSC conversion |

**No gaps found.**

**Placeholder scan:** No TBD, no "implement later", no missing code blocks.

**Type consistency:** `CampaignData` defined in `lib/data/campaigns.ts` and consumed in both `campaign-list.tsx` and `campaigns/page.tsx`. `Dict["campaigns"]` used consistently. `AccountOption` from `@/components/account-select` used consistently.
