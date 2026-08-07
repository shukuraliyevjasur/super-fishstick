# replie docs

Reorganized 2026-08-07. Everything below is current; anything superseded lives in
[archive/](archive/) with its original date.

**Picking up the work?** → **[START-HERE.md](START-HERE.md)** — the ordered execution
plan, with every task resolved to files and verify steps, and the ordering constraints
that are not negotiable.

## Read in this order

| # | Doc | What it is |
|---|-----|------------|
| 1 | [product/decisions.md](product/decisions.md) | **Settled calls with their reasoning.** Do not quietly do something different. If you think one should be reversed, say so explicitly. |
| 2 | [reference/traps.md](reference/traps.md) | **The landmines.** Every one cost real debugging time already. Read before touching the area it names. |
| 3 | [reference/do-not-fix.md](reference/do-not-fix.md) | Things proven to be fine. Re-reporting one is a regression. |
| 4 | [product/roadmap.md](product/roadmap.md) | **What we are building and in what order.** Canonical. Carries the CEO, engineering and design decisions from the 2026-08-07 review pass. |
| 5 | [operations/handbook.md](operations/handbook.md) | How it is deployed, env vars, runbooks, the "before real users" list. Your main operational map. |
| 6 | [product/backlog.md](product/backlog.md) | Deferred work, each with a trigger for when to revisit. |

## Reference

- [reference/architecture-notes](operations/handbook.md) — auth, i18n and routing live in the handbook
- [reference/design-system.md](reference/design-system.md) — design audit and the token rules
- [reference/meta-app-review.md](reference/meta-app-review.md) — App Review submission material
- [reference/setup.md](reference/setup.md) — local setup
- [reference/stack.md](reference/stack.md) — stack overview

## Current state (verified 2026-08-07 against the code, not the docs)

```
tests      240 passing across 26 files   (npm test)
lint       0 errors                      (npm run lint)
typecheck  silent                        (npm run typecheck)
```

All three verified green on 2026-08-07 after `npm ci`. If typecheck reports
`TS2307: Cannot find module '@sentry/nextjs'`, your `node_modules` is behind the
lockfile — run `npm ci`, never `npm install` (see [traps](reference/traps.md)).

Verify before writing code:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
npm run typecheck && npm run lint && npm test
```

If those numbers stop matching, the code changed. Find out why before starting.

## What is blocked, and on what

Neither is a code problem. Do not build around them without asking.

- **Meta Advanced Access** — needs Business Verification, which needs a legal entity
  (YaTT). Not available yet. Caps the app at 50 Instagram accounts and makes every inbound
  DM feature structurally impossible. See [traps](reference/traps.md).
- **Payment rails** — Click/Payme need a merchant account, blocked on the same legal
  entity. Plans are granted manually through `POST /api/admin/plan` meanwhile.

## Conventions

`AGENTS.md` and `CLAUDE.md` stay at the repo root because the agent harness loads them
automatically. Everything else lives here.
