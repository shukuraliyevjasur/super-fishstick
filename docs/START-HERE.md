# Start here

For an agent or engineer picking up replie after the 2026-08-07 review pass. Written
because the roadmap names tasks by id (`E7`, `T16`) and those ids used to resolve only in
local artifacts outside the repo. Everything needed to act is now here.

Read [README.md](README.md) for the doc map, [product/decisions.md](product/decisions.md)
for what is settled, and [reference/traps.md](reference/traps.md) before touching anything.

---

## If you read nothing else, read these two

Both were nearly lost during the review pass that produced this plan. Both are cheap to
respect now and expensive to discover later.

### 1. E3 and E7 must land together, in one lockfile pass, on Linux

grammY (**E3**) and the component-test infrastructure (**E7**) both edit `package.json`
and `package-lock.json`. The lockfile must be generated on Linux — WSL, the GCP VM, or CI.

Doing them on separate branches produces **two individually valid lockfiles that break
`npm ci` when merged.** Each one passes its own CI. The breakage only appears at the merge,
which is the worst place to find it.

One dependency pass. One machine. Both packages.

### 2. Flow-level validation is a condition, not a feature

**D5** in the S3 table looks like one more editor task. It is not. It is the thing that
made the list-with-drill-in editing model acceptable instead of a node canvas (see D7 in
[decisions](product/decisions.md)).

Drill-in means you never see the whole flow at once, so a branch broken three levels down
is off-screen. Validation is what compensates. A live test send only exercises the path the
builder personally taps, so it does **not** substitute.

It nearly got dropped as a side effect of an unrelated question about how to test flows.
If you find yourself cutting it for scope, you are also reversing the editing-model
decision — say that out loud rather than doing it quietly.

---

## Confirm the baseline first

```bash
npm ci
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
npm run typecheck && npm run lint && npm test
```

Expected: **typecheck silent, lint 0 errors, 239 tests passing across 26 files.**

If those do not match, the code changed since 2026-08-07. Find out why before starting.
Use `npm ci`, never `npm install` — see [traps](reference/traps.md).

---

## Ordering constraints that are not negotiable

```
E7 ──blocks──▶ E5      no refactor of untested UI without a safety net first
E1 ──blocks──▶ S1      fix the Redis singleton before adding queues to it
T16 ─blocks──▶ any setWebhook call    the URL gets pinned at Telegram
E3 + E7 must land TOGETHER            both edit package-lock.json, both need Linux
```

That last one is the sharpest merge hazard in the plan. grammY (E3) and the test
infrastructure (E7) both modify `package.json` and `package-lock.json`, and the lockfile
must be generated on Linux. Doing them on separate branches produces two individually
valid lockfiles that break `npm ci` when merged. **One dependency pass, one machine.**

---

## Do these now — independent of everything else

| id | What | Effort (human / CC) |
|----|------|---------------------|
| **T16** | Make the apex `replie.uz` primary in Vercel. No code change; `APP_URL` is already the apex. Must happen before any Telegram bot webhook is registered. | 5 min / — |
| **T17** | Move Supabase to the transaction-mode pooler (port 6543). `max: 1` is per-instance, not global. | 2h / — |
| **T15** | Ceiling probe: check whether individual/identity verification or a borrowed legal entity lifts the tester cap from 50 to 500. External, not code. | 2d / — |
| **E2** | Health signal: base the failed-job threshold on `getWorkerAlerts()`, **not** `getJobCounts().failed`. Files: `lib/ops/health-report.ts`, `lib/ops/worker-health.ts`. | 4h / 30min |

> **E2 supersedes T9.** The CEO review specified a threshold on `getJobCounts().failed`;
> the eng review found that counter is swept every 300s (`removeOnFail: { age: 300 }`), so
> it reads empty most of the time. Use the durable worker-alert store. Ignore T9 as
> written.

---

## S0 — Safety net · start here

**E7** (P1, 1d / 2h) — Add `@testing-library/react` + `happy-dom`, make `vitest.config.ts`
match `.tsx` under `__tests__/`, then write a test pinning the campaign builder's save
payload and its conditional sections.

Files: `vitest.config.ts`, `package.json`, `__tests__/campaign-builder.test.tsx`

Why first: E5 decomposes an 859-line component with **zero** test coverage, and this repo
currently has no way to test a React component at all (`environment: "node"`, `.ts` only,
no testing-library). Mandatory under the regression rule.

Bundle the grammY install (**E3**) into the same lockfile pass — see the ordering
constraint above.

Verify: `npm test` — the new test fails if the save payload changes shape.

## S0b — Refactor

**E5** (P2, 2d / 3h) — Decompose `components/campaign-builder.tsx` into section
components. 859 lines, 24 commits in 30 days, worst churn in the repo.

Blocked by E7. Verify: the pinned payload test still passes, unchanged.

## S1 — Foundation

| id | What | Files |
|----|------|-------|
| **E1** | Replace the Redis singleton with named per-role connections. Options are applied only on the first call today; two more queues make it worse. | `lib/queue/client.ts`, `lib/queue/dm-worker.ts` |
| **E3** | Adopt grammY for the API surface and update routing. **Not** its conversations/session plugin — flow state stays in Postgres (D7 reasoning). | `package.json`, `lib/telegram/client.ts` |
| **E4** | Split queue processors into per-platform modules with one bootstrap. Single process, no new SPOF. | `lib/queue/dm-worker.ts`, `worker/dm-worker.ts` |
| **T1** | Telegram webhook: verify the `X-Telegram-Bot-Api-Secret-Token` header, enqueue, return 200 immediately. Copy the shape of `app/api/webhook/route.ts`. | `app/api/telegram/webhook/route.ts` |
| **T4** | Shared `@replie_bot` by default, optional own-bot token (AES-256-GCM). Broadcast gated to own-bot only (D5). | `prisma/schema.prisma`, `lib/telegram/bot.ts` |
| **T7** | Map Telegram 401/403/429/400. Honor `retry_after`. Mark blocked users unreachable. | `lib/telegram/client.ts` |
| **T13** | Reuse `lib/utils/rate-limiter.ts` for Telegram's 30 msg/s. Do not write a second limiter. | `lib/utils/rate-limiter.ts` |

Verify S1 the way it actually matters: comment the keyword from an account with **no app
role**, and confirm the bot responds. A test from a role-holding account proves nothing.

## S2 — Flows

| id | What |
|----|------|
| **T3** | `TelegramFlow` + `TelegramConversation` models. Flow state in Postgres, TTL sweep folded into the existing health cron. State keys on **(telegramUserId, workspaceId)**. |
| **T5** | `/start` payload: valid, missing, garbage, campaign deleted. Resume last workspace if known. |
| **T6** | Fallback reply when input matches no expected option, so the bot never goes silent. |
| **E6** | Generalise `renderMessageWithoutLink` (`lib/tracking/message.ts:41`) to serve both platforms rather than writing a second renderer. |
| **E9** | Index `lastActiveAt`, delete in batches. Unindexed sweep is a full scan on the hottest new table. |

## S3 — Flow editor

Design is fully specified — read the design section of
[product/roadmap.md](product/roadmap.md) before writing any of it. Wireframes:
`~/.gstack/projects/shukuraliyevjasur-super-fishstick/designs/telegram-flow-editor-20260807/board.html`

| id | What |
|----|------|
| **D1** | List spine with branch drill-in and breadcrumb. **Not** a node canvas (D7). |
| **D2** | Flows become a top-level section, reusable across campaigns and bots (D8). Needs a flow-picker in the campaign builder. |
| **D3** | Empty state is a template picker with 3-4 complete Uzbek/Russian funnels, not a blank page. |
| **D4** | Test send through the real bot to the builder's own Telegram. |
| **D5** | Flow-level validation: unreachable branches, steps with no message, paths with no terminal state. **Not optional** — it is the condition on which the drill-in model was chosen. |
| **D6** | Mobile: Edit and Preview become tabs below the tablet breakpoint. |
| **D7** | Drill-in slide transition, focus to breadcrumb, live-region announce, `prefers-reduced-motion` fallback. |
| **D8** | Telegram-styled live preview panel. Needs the same documented token exception `campaign-preview.tsx` has — see backlog T-3. |

## S4 — Bridge · S5 — Broadcast · S6 — Mini App

| id | What |
|----|------|
| **T10** | Optional Telegram destination type in the campaign builder, campaign id in the deep-link payload. Opt-in only (D4). |
| **T8** | Broadcast: per-recipient checkpointing, preview, typed confirmation. Irreversible either way. |
| **E8** | Cursor-paginate broadcast recipients, per-workspace cap. |
| **T12** | Mini App wrapper over the existing report pages. |
| **E11** | Add `/miniapp` to the `proxy.ts` matcher exclusions **and** to `__tests__/proxy-matcher.test.ts`. |
| **T14** | Extend the data-deletion page to cover Telegram ids, names and captured flow answers. |

## Testing, throughout

**E10** (P1, 3d / 4h) — Coverage of the new surface starts at 1 of 27 paths. Two existing
tests are the right templates: `__tests__/webhook.test.ts` for `secret_token` verification,
`__tests__/rate-limiter.test.ts` for Telegram pacing.

Four paths need E2E rather than unit tests: the full comment→DM→bot journey, a complete
flow conversation, broadcast compose→confirm, and campaign save across the S0b refactor.

---

## What is deliberately not here

Inbound DM keyword auto-reply, a unified DM inbox, and story replies are **structurally
impossible** under Standard Access — not deferred. They need an app role from a person you
cannot identify in advance. Do not spec them. See [reference/traps.md](reference/traps.md).

Payment rails, Telegram Payments, and the read-only canvas view are deferred with triggers
recorded in [product/backlog.md](product/backlog.md).
