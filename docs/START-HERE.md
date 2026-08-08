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

Expected: **typecheck silent, lint 0 errors, 346 tests passing across 37 files.**

> **Note (2026-08-07):** The CI deploy step is currently failing with `ssh: handshake failed: unable to authenticate`. The GCP VM SSH key stored in GitHub Actions secrets is no longer accepted. The build-push step passes. Fix: re-add the correct public key to `~/.ssh/authorized_keys` on the VM, or regenerate the secret in GitHub Actions settings. Code CI (typecheck, lint, test) is unaffected — only the deploy step fails.

> **Note (2026-08-08, resolved):** Every Vercel production build between `55f34e4` and
> `6621abc` failed by hanging the full 45-minute limit in `prisma migrate deploy` against
> the port-6543 transaction pooler. Fixed in `7dbfddd`: `prisma.config.ts` reads
> `DIRECT_URL` for migrations, and `DIRECT_URL` is set in Vercel to the session pooler on
> port 5432. Deploys are green again and the T3 migration applied on the way through.
> **Anywhere else migrations run needs the same variable** — see [traps](reference/traps.md).

If those do not match, the code changed since 2026-08-07. Find out why before starting.
Use `npm ci`, never `npm install` — see [traps](reference/traps.md).

---

## Read the ids carefully: `E` means two different things

The three review passes numbered their findings independently and nobody reconciled them,
so there are **two unrelated `E` sequences** and they collide at `E2`, `E4`, `E5` and `E6`:

| id | In this file and the eng-review table | In the CEO scope table (`roadmap.md`) |
|----|---------------------------------------|----------------------------------------|
| `E2` | Health signal on `getWorkerAlerts()` | The whole conversational funnel |
| `E4` | Split queue processors per platform | Mini App client reports |
| `E5` | Decompose `campaign-builder.tsx` | Telegram Payments (deferred) |
| `E6` | Generalise the message renderer | Broadcast to a campaign's audience |

**Every `E` id in this file is the engineering-review one.** The CEO ids appear only in
`roadmap.md`'s scope table, where two of them carry a prime (`E1′`, `E3′`) — a prime is a
reliable tell, its absence is not. When in doubt, match on the description, not the number.

The `T` and `D` sequences are unambiguous.

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
| ~~**T16**~~ | ~~Make the apex `replie.uz` primary in Vercel.~~ **Done 2026-08-07.** | — |
| ~~**T17**~~ | ~~Move Supabase to the transaction-mode pooler (port 6543).~~ **Done 2026-08-07.** Worker env updated, Vercel updated. | — |
| ~~**T15**~~ | ~~Ceiling probe.~~ **Done 2026-08-07.** No shortcut exists — Meta offers only Business Verification via a legal entity (YaTT). Individual verification is not available for apps. The known path stands: register YaTT → verify → link. | — |
| ~~**E2**~~ | ~~Health signal: base the failed-job threshold on `getWorkerAlerts()`.~~ **Done 2026-08-07.** `checkWorkerAlerts()` reads the durable alert store; 3+ failures in 10 min triggers an email. Does not mark system degraded — worker is alive, just failing sends. | — |

> **E2 supersedes T9.** The CEO review specified a threshold on `getJobCounts().failed`;
> the eng review found that counter is swept every 300s (`removeOnFail: { age: 300 }`), so
> it reads empty most of the time. Use the durable worker-alert store. Ignore T9 as
> written.

---

## ~~S0 — Safety net~~ Done 2026-08-07

~~**E7**~~ — Component test infra (`@testing-library/react`, `happy-dom`, vitest `.tsx`
support) plus 8 pin tests on the campaign builder save payload. **Done.**

~~**E3**~~ — grammY installed in the same lockfile pass. **Done.**

## ~~S0b — Refactor~~ Done 2026-08-07

~~**E5**~~ — Decomposed `components/campaign-builder.tsx` (859 → 623 lines) into
`components/campaign/{primitives,trigger-section,match-section,message-section}.tsx`.
All 248 tests pass unchanged. **Done.**

## S1 — Foundation (partially done 2026-08-07)

| id | What | Status |
|----|------|--------|
| ~~**E1**~~ | ~~Redis singleton → named web/worker connections.~~ | **Done.** `getRedisConnection()` (fail-fast) + `getWorkerConnection()` (persistent). |
| ~~**E3**~~ | ~~grammY client wrapper.~~ | **Done.** `lib/telegram/client.ts` — Bot, sendMessage, error mapping. |
| ~~**E4**~~ | ~~Split queue processors into per-platform modules with one bootstrap.~~ | **Done 2026-08-08 in S2**, as predicted — see the S2 table. |
| ~~**T1**~~ | ~~Telegram webhook endpoint.~~ | **Done.** `app/api/telegram/webhook/route.ts` — verifies the secret token, enqueues to `telegram-processing`, returns 200. |
| **T4** | Shared `@replie_bot` by default, optional own-bot token. | Shared bot works via env var. Own-bot schema deferred to when it's needed. |
| ~~**T7**~~ | ~~Map Telegram 401/403/429/400, honor retry_after.~~ | **Done.** In `lib/telegram/client.ts` — typed `TelegramSendResult`. |
| ~~**T13**~~ | ~~Reuse rate-limiter for Telegram's 30 msg/s.~~ | **Done.** `reserveTelegramSlot()` in `lib/telegram/client.ts`. |

Verify S1 the way it actually matters: comment the keyword from an account with **no app
role**, and confirm the bot responds. A test from a role-holding account proves nothing.

## ~~S2 — Flows~~ Done 2026-08-08

The engine is complete and covered. **S3 is next** — and note what S3 unblocks: until
something can create a `TelegramFlow`, the engine has nothing to run.

| id | What | Status |
|----|------|--------|
| ~~**T3**~~ | ~~`TelegramFlow` + `TelegramConversation` models.~~ | **Done.** Schema + migration `20260807120000_add_telegram_models`, **applied to production 2026-08-08** by the Vercel build. No VM step needed. |
| ~~**E6**~~ | ~~Generalise `renderMessageWithoutLink`.~~ | **Done 2026-08-08.** `platform` param (default `"instagram"`), `recipientName` alongside the original `commenterName`, rules in `PLATFORM_RULES`. Both platforms render identically today — pinned by a test so a future divergence has to be deliberate. |
| ~~**T5**~~ | ~~`/start` payload handling.~~ | **Done 2026-08-08.** `lib/queue/telegram-worker.ts`. Valid campaign id → workspace's active flow → conversation at the entry step. Deleted campaign and garbage payload give the same answer on purpose (distinguishing them leaks whether an id existed). Bare `/start` resumes the last workspace. Step schema is **D9**. |
| ~~**T6**~~ | ~~Never-silent fallback.~~ | **Done 2026-08-08.** Unrecognised reply → "did not understand" + the prompt re-sent with its keyboard, and the step does **not** advance. Also covers: typing at a bot you never started, and a flow edited out from under a live conversation. |
| ~~**E4**~~ | ~~Split queue processors per platform.~~ | **Done 2026-08-08** — landed with T5 exactly as predicted. Separate `telegram-processing` queue, one worker process boots both (`worker/dm-worker.ts`). |
| ~~**E9**~~ | ~~Conversation TTL sweep.~~ | **Done 2026-08-08.** `lib/telegram/conversation-sweep.ts`, folded into the health-check cron. 30-day cutoff on the `lastActiveAt` index, 500-row batches, ceiling of 10k rows per run so it cannot time out the request. `conversationSweepHitCap` in the cron's response is the signal that the backlog is not draining. |

> **Not yet wired to anything.** The engine runs, but nothing creates a `TelegramFlow`
> (that is S3) and no campaign emits a `t.me/…?start=<campaignId>` link (that is **T10**,
> in S4). To exercise it end to end today you must insert a flow row by hand. The bot
> answers every path safely meanwhile — an unstarted user gets `BOT_COPY.noPayload`, not
> silence.
>
> Bot-facing copy is in `lib/telegram/copy.ts`, in one file so it can be rewritten without
> touching the engine. It is placeholder-quality Uzbek written by an engineer — **it wants
> a pass from someone who sells to these customers.**

## ~~S3 — Flow editor~~ Done 2026-08-08

| id | What | Status |
|----|------|--------|
| ~~**D1**~~ | ~~List spine with branch drill-in.~~ | **Done.** `components/flows/flow-editor.tsx`; traversal in `lib/telegram/flow-chain.ts`, shared with validation so the editor cannot disagree with the bot. |
| ~~**D2**~~ | ~~Top-level Flows section + picker.~~ | **Done.** Section, CRUD API, and the campaign picker (landed with T10). |
| ~~**D3**~~ | ~~Template picker empty state.~~ | **Done.** Three Uzbek funnels, each asserted valid by test. **Russian still missing** — needs a translator, not an engineer. |
| ~~**D4**~~ | ~~Test send through the real bot.~~ | **Done.** Real conversation via `lib/telegram/engine.ts`, same path a customer hits. Builder links their own Telegram with a one-time `lnk_` code. |
| ~~**D5**~~ | ~~Flow-level validation.~~ | **Done, and built first** so it could not be cut for scope. Enforced in the editor *and* server-side on save. |
| ~~**D6**~~ | ~~Mobile tabs.~~ | **Done.** Measured at 375 / 800 / 1280. |
| ~~**D7**~~ | ~~Drill-in transition + a11y.~~ | **Done.** Slide, focus to breadcrumb, live-region announce, `prefers-reduced-motion` fallback. |
| ~~**D8**~~ | ~~Telegram-styled preview.~~ | **Done.** Carries the token exception backlog T-3 asks for, stated in the file. |

> The wireframe path the plan pointed at does not exist on this machine. Owner's call
> 2026-08-08: it was a showcase, not a design decision, so the written spec governs.

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
