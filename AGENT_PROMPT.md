# Starting prompt for the next agent

Copy the block below into a fresh agent session pointed at this repo.

**The pre-launch review is finished** — 16 of 19 findings landed on 2026-08-04.
This prompt was rewritten for what comes next; the previous version, which drove
the review work, is in git history if you need it.

---

```
You're picking up replie, a live Instagram comment-to-DM SaaS (Next.js 16, Prisma 7,
Supabase Postgres, BullMQ/Redis, worker on a GCP VM), deployed at replie.uz and not
yet open to real users.

The pre-launch review is DONE — do not start there. 16 of 19 findings landed on
2026-08-04; the 3 open ones are blocked on things outside the codebase and each says
so in FIX_BRIEF.md. Re-fixing a closed finding is a regression.

START HERE, in this order:
1. AGENTS.md      - loads automatically; points at everything else
2. DECISIONS.md   - settled calls, D1-D3. Do not quietly do something different.
                    If you think one should be reversed, say so out loud.
3. HANDOFF.md     - deployment, the "Before real users" list, and the traps that
                    cost real debugging time. This is your main map now.
4. FIX_BRIEF.md   - the review worklist, now mostly closed. Read the "Do NOT fix
                    these" section before touching anything.

Confirm the baseline before writing code:
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
  npm run typecheck && npm run lint && npm test

Expected: typecheck silent, lint 0 errors (304 warnings are pre-existing and fine),
229 tests passing across 26 files. If that doesn't match, stop and tell me before
changing anything.

What actually needs doing, roughly in order of what blocks launch:

1. META APP REVIEW. The real gate on self-serve signup. Verification first (needs
   the YaTT registration), then App Review. META_APP_REVIEW.md is stale in three
   specific ways listed in HANDOFF.md and will fail review as written. This is
   mostly not a coding task.

2. MESSAGING WEBHOOKS HAVE NEVER FIRED. Opening DM and follow gate are shipped
   behind a "Soon" badge because a button tap delivers nothing. Both are features
   the pricing page sells. HANDOFF.md records what has already been ruled out —
   read it before forming a theory, and do not assume App Review is the cause.

3. C2, error tracking (Sentry or equivalent). The only remaining finding that adds
   a dependency. GENERATE THE LOCKFILE ON LINUX — WSL, the GCP VM, or CI. Never on
   Windows; see the dependencies section in HANDOFF.md.

4. Before real traffic: session revocation (JWT sessions can't be revoked
   server-side, D1) and the Supabase transaction-mode pooler on 6543 (`max: 1` is
   a per-instance cap, not a global one).

5. P2, payment rails — BLOCKED on merchant credentials from Click or Payme. Do not
   start it; the owner is pursuing access. FIX_BRIEF.md P2 lists exactly what will
   be needed when it unblocks. It should be small: grantWorkspacePlan() already
   exists and the webhook just calls it.

How I want you to work:
- One logical change per commit. Re-run the full verification after each.
- ALWAYS run `git diff package-lock.json` before committing. If you didn't intend a
  dependency change, discard it. A lockfile regenerated on Windows installs fine
  locally and breaks `npm ci` on Linux.
- Pushing to main auto-deploys AND runs `prisma migrate deploy` against the live
  database. Know what's in prisma/migrations/ before you push.
- If something contradicts the docs, tell me rather than guessing. The docs were
  written from verified evidence, so a contradiction means something changed.

Begin by confirming the baseline and telling me what you're starting with and why.
```

---

## What landed in the review pass (2026-08-04)

Closed: **S1–S5** (every security finding), **C1**, **C3**, **Q1–Q3**, **Q5**,
**Q6**, **P1**, **P3**, **P4**. Q4 is code-complete pending an operator decision.

Three pieces of that work are load-bearing for anything built next:

- **`grantWorkspacePlan()`** (`lib/billing/grant.ts`) is the *only* writer of
  `workspace.plan`. The payment webhook must call it rather than updating the row.
- **`isCurrentUserPlatformAdmin()`** (`lib/auth/admin.ts`, D3) gates anything
  cross-tenant. Never gate platform-wide access on `canManageWorkspace` — every
  customer is OWNER of their own workspace.
- **`requireCronAuth()`** (`lib/ops/cron-auth.ts`) guards every operational
  endpoint and fails closed. Do not add a fallback secret or an `if (secret)`
  wrapper.

## Two things to watch

**The docs are deliberately opinionated about what *not* to do.** Roughly a third
of FIX_BRIEF.md is landmines and disproved findings. That is the part that saves
money — without it an agent will re-derive the Instagram code-100 dead end (six
deploys), re-report the React 19 `href` XSS, or regenerate the lockfile on Windows
and break CI.

**Two operator actions are outstanding and are not code.** An external uptime
monitor, and picking a canonical host. Both are in "Before real users" in
HANDOFF.md with the reasoning. Don't build around their absence — ask.

## Baseline verified

2026-08-04: typecheck silent, lint 0 errors / 304 warnings, **229 tests passing
across 26 files**, `package-lock.json` unchanged across the entire review pass —
zero dependencies were added.

If those numbers stop matching, the code changed. Find out why before starting.
