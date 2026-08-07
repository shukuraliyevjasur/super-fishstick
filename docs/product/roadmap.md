---
status: ACTIVE
---
# Telegram Expansion + Instagram Ceiling Probe

**Design doc.** Produced by a CEO-mode plan review on 2026-08-07, promoted from
`~/.gstack/projects/`. Mode: SCOPE EXPANSION. Branch: `main`.

Read alongside [DECISIONS.md](decisions.md) (settled architecture calls),
[HANDOFF.md](../operations/handbook.md) (deployment traps and Meta status), and
[ROADMAP.md](../archive/2026-08-07-roadmap-superseded.md) (the sequencing this revises).

**The scope and architecture decisions below are settled.** Do not quietly do something
different. If one should be reversed, say so explicitly and explain what changed.

## Context this review established

Four facts were unknown when [ROADMAP.md](../archive/2026-08-07-roadmap-superseded.md) was written, and all four
came out of the pre-review audit.

**1. The Meta tester cap is 50.** Meta's App Roles doc: unlinked apps get up to 50
testers; apps linked to Business Manager *with* Business Verification get 500. Against
`PLAN_LIMITS`, AGENCY sells 20 Instagram accounts, so ~2.5 agency customers or ~10 Pro
customers fill the app.

**Owner's ruling: 50 is temporary, not a permanent constraint. Do not architect around
it.** Treat it as pilot capacity — enough for 5-10 customers, which is roughly what
validation needs — not as a business ceiling. It lifts when a legal entity exists.

**2. Business Verification has a carve-out, and replie is already inside it.** Meta:
*"If your app will only be used by app users who have a role on the app itself you do not
need to complete verification."* That legitimizes the tester-only model and caps it at 50.

**3. The competitive premise in the expansion spec is stale.** It names ManyChat as the
competitor on price. As of 2026 the comment-to-DM category has commoditized: InstantDM
$9.99/mo (a Meta Business Partner, so self-serve onboarding), Inrō €12.99, CreatorFlow
$15 flat, LinkDM/ReplyRush $19 flat. ManyChat gutting its free plan in March 2026
(1,000 → 25 contacts) created this tier. **Price is no longer a wedge.** Uzbek-language,
Telegram-native, local payment and white-glove agency service still are.

**4. Independent confirmation of the Standard Access finding.** An n8n community thread
(Aug 2025) reports identical behaviour: messaging webhooks fire only when the DM comes
from an account designated as a tester. Not a misconfiguration — platform behaviour.

## Approach selected (D1)

**Ceiling probe + Telegram-first.** Spend 1-2 days on the unchecked verification paths
(individual/identity verification; a borrowed legal entity), then build Telegram-first
regardless of the outcome.

**Rationale correction (owner, post-D1):** the D1 case leaned partly on the 50-cap being
a hard business ceiling. That argument is void. Telegram-first survives on its own merits:
Instagram inbound conversation is structurally dead under Standard Access *regardless of
the cap*, and Telegram is the only surface where two-way automation is possible at all.

## Governing constraint (owner, post-D3)

**Do not fuse the two products.** A customer who does not want Telegram must never be
required to touch it. Every Telegram capability is opt-in and additive; Instagram-only
customers see no change. This killed the first version of E1, which had made Telegram a
mandatory hop in the Instagram funnel.

## Vision

### 10x check

The roadmap treated Telegram as a feature ("lead ping + keyword bot"). The reframe: every
capability Meta denies under Standard Access is free and unrestricted on the Telegram Bot
API — inbound message reads, keyword auto-reply, unified inbox, multi-step flows,
broadcast (legal on Telegram, ban-worthy on Meta), native payments, and no account cap.

The features that died in this session are exactly the features Telegram gives away.

### Platonic ideal (12 months)

An agency connects one Instagram account and, if they want it, one Telegram bot per
client. A reel goes viral; 400 people comment the keyword. Each gets an Instagram DM.
Those who opt into the Telegram funnel land in the client's bot, which greets them in
their own language, answers the question, and qualifies them. At month end each client
opens a white-label report as a Mini App inside Telegram. Later, the agency broadcasts a
new offer to everyone that campaign ever captured.

Nothing in that flow needs Meta to approve anything beyond the comments webhook that
already works.

What the user feels: they stop drowning. The 200-DM flood becomes 200 qualified rows.

## Scope Decisions

| # | Proposal | Effort (human / CC) | Decision | Reasoning |
|---|----------|---------------------|----------|-----------|
| E1′ | Telegram bot as an **optional** campaign destination, with campaign ID in the `/start` payload | ~2d / ~2h | **ACCEPTED** | Reshaped after the no-fusion ruling. Opt-in destination type; invisible to non-Telegram customers. Pasting a `t.me` link already works — this adds bot connection plus automatic campaign attribution, which is what makes per-campaign flows possible. |
| E2 | Telegram bot as a full conversational funnel (multi-step, inline keyboards, qualification, branching) | engine ~2wk / ~1-2d **+ editor ~4wk / ~3d** | **ACCEPTED** | The actual product. Converts a comment into a qualified lead with no human. No approval gate exists on Telegram. **Two corrections from the deep review:** it does *not* reuse the `Automation` model (Issue 4 — that model is Instagram-shaped and already ~30 fields), and the original estimate covered only the engine, not the visual editor (Issue 8 — owner chose the full branching editor over linear-first). |
| E3′ | Lead notifications to Telegram (notification-only, no CRM state) | ~2d / ~2h | **CUT** | Owner's call. Note this also removes the original ROADMAP.md Phase 3.1 "Telegram lead ping" — same feature. Privacy concern that motivated the rescope (group posts leave replie's access control permanently and cannot be revoked) is moot now. |
| E4 | White-label client reports as a Telegram Mini App | ~1wk / ~4h | **ACCEPTED** | Reuses existing report pages and `randomBytes(9)` share slugs, so most of the work exists. "Your client never leaves Telegram" is a concrete Agency-tier selling point. |
| E5 | Telegram Payments inside the bot flow | ~1wk / ~4h + per-client merchant setup | **DEFERRED** | Blocker is not code: every client needs their own provider credentials, which adds per-client merchant onboarding to a product whose main problem is already manual onboarding. Revisit when agencies ask by name, and after replie's own payment rails exist. |
| E6 | Broadcast to everyone who came through a campaign | ~4d / ~3h | **ACCEPTED** | The clearest capability Instagram will never permit. Turns one-time lead capture into a reusable audience — the ongoing reason an agency keeps paying monthly. Needs paced sending; Telegram throttles bulk and will limit a bot that ignores it. |

## Accepted Scope (added to this plan)

- **E1′** — Telegram bot connection per workspace; optional campaign destination type; campaign ID passed through the `/start` deep-link payload for attribution.
- **E2** — Conversational funnel: multi-step flows, inline keyboards, qualifying questions, stored answers, branching.
- **E4** — Client reports delivered as a Telegram Mini App over the existing report pages.
- **E6** — Rate-limited broadcast to a campaign's captured audience, paced through BullMQ.

**Carried from ROADMAP.md, unchanged by this review:**
- Ceiling probe (individual/identity verification; borrowed entity) — 1-2 days, runs first.
- Instagram Phase 0 (follow gate via reveal-token, P5) continues as maintenance-level work, not headline scope.

> **Correction, 2026-08-07:** P6 (customisable link button label) was carried through the
> CEO and engineering reviews as outstanding. It is **already shipped** — verified in the
> code: state, load, save, a real `<input>` at `components/campaign-builder.tsx:779`,
> preview wiring, and `buildLinkButtons` consuming `automation.linkButtonLabel`. The
> archived fix brief still lists it as open; that entry is wrong.

## Deferred to TODOS.md

- **E5 — Telegram Payments in-flow.** Needs a payment provider token per client. Revisit after replie's own payment rails (P2) exist and once an agency asks for it by name.
- **META_APP_REVIEW.md rewrite.** Stale three ways (3 permissions listed vs 4 requested; magic-link script vs password signup; says "OpenReply"). ~1h. Trigger is now "a legal entity exists," not a date — it will re-stale before submission otherwise.

## Explicitly cut

- **E3′ — Telegram lead notifications**, including the original roadmap's Phase 3.1 lead ping.

## Architecture decisions from the deep review (Sections 1-11)

Eight issues surfaced; all eight resolved. Recorded here so they are not re-litigated.

| # | Issue | Decision | Why |
|---|-------|----------|-----|
| 1 | One worker, one queue, three workloads with incompatible latency needs | **Separate queue + priority** | Instagram DM sends tolerate delay; a person typing to a bot does not. A 10k broadcast ahead of them makes every bot feel dead. Same worker process, so no new SPOF. |
| 2 | Telegram updates carry no bot identity; unauthenticated endpoint accepts forgeries | **Shared `@replie_bot` default, own bot optional, broadcast requires own bot** | Per-customer bots were rejected as onboarding friction (owner). Shared bot removes the routing problem entirely — one webhook, one `secret_token`, workspace resolved from the `/start` payload. Broadcast is fenced to customer-owned bots so one spammer cannot get the shared bot banned and kill every customer at once. |
| 3 | Where does multi-step conversation state live | **Postgres + `lastActiveAt` TTL sweep in the existing health cron** | Redis is `noeviction` (set 2026-08-04) and holds the job queue; unbounded chat state there can wedge the queue and stop Instagram DMs for everyone. |
| 4 | Reuse `Automation` for Telegram flows | **Separate `TelegramFlow` model** | `Automation` is Instagram-shaped (`postId`, `matchAnyPost`, `instagramAccountId`, `publicReplyMessages`) and already ~30 fields. Also structurally consistent with the no-fusion ruling. |
| 5 | Bare `/start` with no campaign context on a shared bot | **Branded fallback + resume last workspace if known** | Guaranteed to happen via Telegram search and forwarded links. Turns a dead end into a small marketing surface. |
| 6 | Broadcast is irreversible with no resume and no confirm | **Per-recipient checkpointing + preview + typed confirm** | A job dying at 3k/10k double-messages 3k people with no unsend; a typo reaches an entire audience permanently. One-way door — no do-nothing option was offered. |
| 7 | A revoked bot token fails silently | **Fix the general failed-job threshold in `checkQueue()`** | Same shape as the C3 token-refresh bug. Fixing the general case also closes the known C1 gap where an alive-but-failing worker reports healthy, rather than adding a second one-off alert. |
| 8 | The flow builder is a visual editor and the estimate did not cover it | **Full branching editor now** | Owner chose the complete version over linear-first. Largest single item in the plan (~4wk human / ~3d CC). |

### Shared-bot wrinkles to design for

- Conversation state must key on **(telegramUserId, workspaceId)**, not user alone — the same person can arrive through two different customers' campaigns.
- The shared bot's ~30 msg/s Telegram ceiling is pooled across all customers. Fine at pilot scale; needs a metric before it isn't.
- White-label is impossible on the shared bot by construction. That is the Agency-tier upsell, sitting alongside the white-label reports that tier already sells.

## Engineering decisions (plan-eng-review, 2026-08-07)

Nine issues surfaced, all resolved. Two of them **revise decisions made in the CEO review** —
noted explicitly rather than silently overwritten.

| # | Issue | Decision |
|---|-------|----------|
| 0 | 18 files / 7 new modules blew both complexity thresholds | **Slice into 6 shippable increments, all scope kept.** See Delivery slices below. |
| 1 | `lib/queue/client.ts:10-28` — the Redis singleton applies `opts` only on the first call; `getDMQueue()` passes none while the worker passes `{persistent:true}` | **Named per-role connections.** Works today only by call ordering; two more queues make it worse. BullMQ requires `maxRetriesPerRequest: null` for workers. |
| 2 | `removeOnFail: { age: 300 }` erases the counter the CEO-review alert would read | **Base the threshold on `getWorkerAlerts()`** instead of `getJobCounts().failed`. **Revises CEO Issue 7 / task T9.** The alert as originally specified worked only because cron-job.org polls every 60s. `worker-health.ts:75` already persists every failure durably and, per C1, nothing consumes it. |
| 3 | Plan called the Bot API by hand; grammY is the standard | **Adopt grammY** for the API surface and update routing. **Lockfile must be generated on Linux** (AGENTS.md). Do **not** adopt its conversations/session plugin — flow state stays in Postgres per Issue 3 of the CEO review. |
| 4 | `lib/queue/dm-worker.ts` is 855 lines and gains two processors | **Separate processor modules, one bootstrap.** Single process (no new SPOF), one module per platform. |
| 5 | `components/campaign-builder.tsx` — 859 lines, 24 commits/30d, worst churn in the repo | **Full decomposition** into section components. Owner chose this over the smaller extraction. |
| 6 | `lib/tracking/message.ts:41` already does variable substitution | **Generalise it for both platforms** rather than writing a second renderer. |
| 7 | No React component test capability exists (`vitest.config.ts` is `environment: "node"`, matches only `.ts`, no testing-library) while #5 refactors untested UI | **Add testing-library + happy-dom, pin the save payload, then refactor.** Mandatory under the regression rule — **blocks #5**. Rides the lockfile regeneration #3 already forces. |
| 8 | Broadcast loading all recipients competes for memory with the Instagram queue | **Cursor-paginate + a per-workspace recipient cap.** |
| 9 | Unindexed TTL sweep is a full scan on the hottest new table | **Index `lastActiveAt`, delete in batches.** |

### Delivery slices

Each is independently shippable and independently useful. Scope is unchanged; only the
delivery shape.

```
Now (independent of Telegram) ── E2 health signal, T16 canonical host, T17 pooler, T15 ceiling probe
S0 Safety net  ── E7 component test infra + pin builder payload   [BLOCKS S0b]
S0b Refactor   ── E5 campaign-builder decomposition
S1 Foundation  ── E1 conns, E3 grammY, E4 modules, webhook, client, shared bot, errors
S2 Flows       ── TelegramFlow model, engine, /start handling, fallback, E6, E9
S3 Editor      ── branching flow builder UI
S4 Bridge      ── optional Telegram campaign destination
S5 Broadcast   ── checkpointing, preview, typed confirm, E8
S6 Mini App    ── report wrapper, E11 matcher exclusion
```

**Ordering constraints that are not negotiable:** E7 before E5 (no refactor without a
safety net). T16 before any bot webhook is registered (`setWebhook` pins a URL). E1 before
S1 adds queues.

### Test posture

Coverage of the new surface starts at **1/27 paths**. Framework is vitest with 26 existing
logic tests. Two existing tests are the right templates: `webhook.test.ts` for
`secret_token` verification, `rate-limiter.test.ts` for Telegram pacing. Four paths are
marked E2E: the full comment→DM→bot journey, a complete flow conversation, broadcast
compose→confirm, and campaign save across the refactor. Full plan in
`~/.gstack/projects/.../User-main-eng-review-test-plan-20260807-1530.md`.

## Design decisions — S3 flow editor (plan-design-review, 2026-08-07)

Plan rated **2/10** on design completeness at entry: the editor had a one-line description
and an effort estimate, and nothing about what a user sees or does. **8/10** after this pass.

### Editing model: list spine + branch drill-in

Chosen over a node canvas and over a flat ordered list. Three wireframes at real token
values are at
`~/.gstack/projects/shukuraliyevjasur-super-fishstick/designs/telegram-flow-editor-20260807/board.html`.

The flow reads top to bottom as a list of step cards. Tapping a branch replaces the list
with that branch's own list, with a breadcrumb showing depth. A persistent side panel
renders a live Telegram-styled preview.

**Why not a canvas:** it costs about four weeks, introduces five new concepts a first-time
SMM worker must learn (pan, zoom, node, edge, auto-layout), and is effectively unusable on
the phone this audience works from. It is also literally copying ManyChat's breadth, which
the product research explicitly warned against.

**Why not a flat list:** a two-level depth ceiling, which would partly reverse the
eng-review decision to build the full branching editor.

**Deferred, by decision:** a **read-only** canvas view added later as a view toggle.
Editing stays in the list. Two interaction models to keep consistent — the risk is the
second gets left half-finished.

### Resolved decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Where does a flow live? | **Top-level Flows section**, reusable across campaigns and bots. An agency builds a price-enquiry funnel once and points ten campaigns at it — the same logic as the bulk-campaign work. Needs a flow-picker in the campaign builder. |
| 2 | Empty state of a new flow | **Template picker: 3-4 complete working Uzbek/Russian funnels** (price enquiry, booking, catalogue) the user edits. Demonstrates the model instead of explaining it, and doubles as onboarding. |
| 3 | How do you know a flow works? | **Test send through the real bot to the builder's own Telegram**, plus the validation summary below. Tests the actual path, not a simulation that can diverge. |
| 4 | Mobile at 375px | **Edit and Preview become tabs** below the tablet breakpoint, not stacked columns. The preview stays a deliberate destination rather than falling below the fold. |
| 5 | Flow-level validation | **Kept** — this was a condition of the drill-in model, not an optional extra. Surfaces unreachable branches, steps with no message, and paths with no terminal state. A live test only exercises the path you personally tap. |
| 6 | Drill-in transition + a11y | **Slide in from the right, slide back on return**; focus moves to the breadcrumb and a live region announces which branch was entered. Falls back to a cross-fade under `prefers-reduced-motion`. |

### Design system

Calibrated against the closed scales in `app/globals.css` (`@theme inline`), documented in
[HANDOFF.md](../operations/handbook.md) §Design system: Plus Jakarta Sans, headings weight 800, 11px
type floor, `rounded-md` controls / `rounded-lg` cards / `rounded-full` pills, neutrals
`foreground`/`muted`/`subtle`, accent `#0145F2` used once per screen, no raw Tailwind colors.

**AI-slop classifier: APP UI.** Litmus passes 6 of 7 — the preview panel is the single
visual anchor, step labels make it scannable, each section has one job, cards genuinely are
the interaction, and it holds up with only hairline borders. The seventh (motion) is closed
by decision 6 above.

**Note:** the design system lives inside HANDOFF.md, which every agent session is told to
read, so it works — but `DESIGN.md` is where a designer would look for it.

## Open risks carried into the deep review

1. **The discovery-hop assumption is untested.** The expansion spec states Telegram is not a discovery channel in Uzbekistan — people search for known channels rather than browsing. E1′ asks a reel commenter to leave Instagram and start a bot. If that hop converts poorly, E2/E4/E6 all inherit the loss. Cheap test: put a `t.me` link behind one live campaign and measure click-through to `/start` before building E2.
2. ~~**Bot ownership model is unresolved.**~~ **RESOLVED** by CEO Issue 2b: shared
   `@replie_bot` by default, own bot as an optional white-label upsell, broadcast fenced to
   own-bot only. Per-customer bots were rejected as onboarding friction.
3. **E1′ competes with Instagram Phase 0.** If conversation moves to Telegram, the follow
   gate, P5 and the reveal-token wiring matter less. They are not complementary; do not fund
   both at full weight.
4. ~~**Churn concentration.**~~ **ADDRESSED** by eng Issues 5 and 7: the campaign builder
   gets decomposed behind a pinned-payload test, and the worker splits into per-platform
   processor modules. Both churn hotspots are structurally attacked rather than added to.
   Watch whether churn actually drops after those land.
5. **The 30 msg/s Telegram ceiling is pooled on the shared bot.** Fine at pilot scale,
   invisible until it isn't. Needs a metric before it becomes a support ticket.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 6 proposals, 4 accepted, 1 deferred, 1 cut |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 9 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 2/10 → 8/10, 7 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**OUTSIDE VOICE:** skipped — Codex CLI not installed (`npm install -g @openai/codex`); the
Claude-subagent fallback was not run.

**VERDICT:** CEO + ENG + DESIGN CLEARED — ready to implement.

**Approved mockups**

| Screen | Path | Direction |
|---|---|---|
| Telegram flow editor | `~/.gstack/projects/shukuraliyevjasur-super-fishstick/designs/telegram-flow-editor-20260807/board.html` | **C** — list spine + branch drill-in, with a persistent Telegram-styled preview. A and B (node canvas, flat ordered list) rejected; reasoning in the design section above. |

NO UNRESOLVED DECISIONS
