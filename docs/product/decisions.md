# Decisions

Durable product and architecture decisions for replie, with the reasoning behind them.

Read this before proposing an alternative to something listed here — these are settled
calls, not open questions. If you believe one should be reversed, say so explicitly and
explain what changed, rather than quietly doing something different.

Newest first. When a decision is superseded, keep the original and mark it, so the
history stays readable.

D4–D8 came out of the 2026-08-07 review pass (CEO → engineering → design). The
implementation-level calls from that pass — grammY, a separate `TelegramFlow` model,
Postgres-backed flow state, split queues — live in
[roadmap.md](roadmap.md) rather than here, because they are architecture rather than
product direction.

---

## D9 — The flow step schema, and how a campaign finds its flow

**Date:** 2026-08-08
**Status:** active
**Applies to:** `TelegramFlow.steps`, the flow engine, the S3 editor

### The decision

`TelegramFlow.steps` is an array of steps, defined in `lib/telegram/flow-types.ts`:

```ts
{ id, message, options?: [{ label, nextStepId }], saveAnswerAs?, nextStepId? }
```

**The first step in the array is the entry point.** Every edge out of a step is either an
option's `nextStepId` or the step's own `nextStepId`, and `null` means the path ends here.
Answers are a flat string map keyed by `saveAnswerAs`.

Buttons carry their option's **index** in `callback_data`, not the label: Telegram caps
`callback_data` at 64 bytes, and a readable Uzbek label is UTF-8, so labels silently break
the cap and Telegram rejects the whole message.

~~**Until D8's flow-picker exists**, a `/start` campaign id resolves to its workspace's
most recently updated active flow.~~ **Superseded 2026-08-08 by T10.** The campaign's own
`telegramFlowId` is authoritative. The workspace lookup survives only as a fallback for
campaigns created before the picker existed, whose links may already be printed in
someone's bio, and for a campaign whose chosen flow has been paused.

### Why

The engine had to ship before the editor, so something had to define the serialization
format. One traversal model — "an edge is a `nextStepId`, `null` ends the path" — is what
makes D5's validation cheap: an unreachable branch is a step nothing points at, and a path
with no terminal state is a cycle with no `null`. A shape that needed a second traversal
model for validation would have made D5 expensive enough to be at risk, and D5 is the
condition on which D7's drill-in editing model was accepted.

The campaign→flow resolution was explicitly a **placeholder for D8**, not a competing
design. It was retired on 2026-08-08 with T10, as planned — mostly. It was *narrowed*
rather than deleted, because deleting it outright would break links already printed in
someone's bio by a campaign that predates the picker. A paused flow also falls back rather
than going silent: pausing is the owner saying "stop running this", not "say nothing".

The step schema itself is unchanged and load-bearing: `lib/telegram/flow-chain.ts`,
`flow-validation.ts` and the runtime engine all walk it with the same rule, which is what
keeps the editor from disagreeing with the bot.

---

## D8 — Flows are a top-level, reusable asset

**Date:** 2026-08-07
**Status:** active
**Applies to:** Telegram conversation flows, the campaign builder

### The decision

A flow is **not** owned by a bot or by a campaign. It is a top-level entity that many
campaigns and bots can point at. The campaign builder gets a flow-picker.

### Why

An agency running the same price-enquiry funnel for ten clients builds it once, not ten
times. That is the same argument that drives the bulk-campaign work, and the target
customer is explicitly the agency with many accounts.

Owning a flow by bot would mirror how Telegram works, but forces duplication to reuse.
Owning it by campaign matches the existing Instagram structure but makes the editor's cost
land on every campaign.

---

## D7 — The flow editor is a list with drill-in, not a node canvas

**Date:** 2026-08-07
**Status:** active
**Applies to:** the Telegram flow builder UI

### The decision

The flow reads top to bottom as a list of step cards. Tapping a branch replaces the list
with that branch's own list, with a breadcrumb for depth. A **read-only** canvas view may
be added later as a view toggle; editing stays in the list.

### Why

A canvas costs roughly four weeks, introduces five concepts a first-time SMM worker must
learn (pan, zoom, node, edge, auto-layout), and does not work on the phone this audience
works from. It is also literally copying ManyChat's breadth, which the market research
warned against — the wedge is focus and localization, not feature parity.

A flat list was rejected for a two-level depth ceiling.

### How to apply

- The known weakness is that you never see the whole flow at once, so **flow-level
  validation is not optional** — unreachable branches, steps with no message, and paths
  with no terminal state must be surfaced.
- Do not start the read-only canvas until the list editor has real users. Two interaction
  models to keep consistent; this is the one most likely to be left half-finished.

---

## D6 — The 50-tester cap is pilot capacity, not a design constraint

**Date:** 2026-08-07
**Status:** active
**Applies to:** planning, pricing, sales

### The decision

A Meta app not linked to a verified Business is capped at **50 testers**, which under
Standard Access is the ceiling on Instagram accounts replie can serve. **Treat this as
temporary.** Do not architect around it, do not reposition the product around it, and do
not price against it as if permanent.

### Why

Owner's ruling. The cap lifts to 500 with Business Verification, and to unlimited with
App Review — both gated on a legal entity that is being pursued. Designing a product
around a constraint that is expected to disappear produces decisions that are wrong twice:
once while the constraint holds, and again after it lifts.

### How to apply

- 50 accounts is roughly 5-10 agency customers, which is about what validation needs. Use
  it as a beta cap.
- Do not build a sales pipeline larger than it without checking the number first.

---

## D5 — One shared Telegram bot by default; a customer's own bot is an upsell

**Date:** 2026-08-07
**Status:** active
**Applies to:** Telegram onboarding, broadcast

### The decision

Customers' audiences talk to a single shared `@replie_bot` by default. The workspace is
resolved from the `/start` deep-link payload. A customer may connect their **own** bot for
white-labeling. **Broadcast requires an own bot** and never runs on the shared one.

### Why

Per-customer bots were rejected as onboarding friction: BotFather, a token, and a paste
step, stacked on top of the Instagram tester invite that already cannot be avoided. A
shared bot means a new customer connects nothing.

It also removes an architectural problem — Telegram updates carry no bot identity, so N
bots would need per-bot webhook URLs to route at all.

The cost is a shared reputation: one spammer can get the shared bot limited or banned and
every customer stops at once. Fencing broadcast — the ban-risk feature — to customer-owned
bots isolates that. The shared bot's ~30 msg/s ceiling is also pooled across all customers,
which is a second reason broadcast does not belong on it.

### How to apply

- Conversation state keys on **(telegramUserId, workspaceId)**, not user alone — the same
  person can arrive through two customers' campaigns.
- Verify the `X-Telegram-Bot-Api-Secret-Token` header on every webhook request.
- White-label is impossible on the shared bot by construction. That is the Agency-tier
  upsell, alongside white-label reports.

---

## D4 — Instagram and Telegram stay unfused

**Date:** 2026-08-07
**Status:** active
**Applies to:** every Telegram feature

### The decision

**A customer who does not want Telegram must never be required to touch it.** Every
Telegram capability is opt-in and additive. Instagram-only customers see no change.

### Why

Owner's ruling, and it killed the first version of the Instagram→Telegram bridge, which
had made Telegram a mandatory hop in the Instagram funnel.

Note the bridge already works without any code: `trackedDestinationUrl` accepts any https
URL and `https://t.me/bot?start=x` passes `isHttpUrl`. What the product adds is the bot
connection and automatic campaign attribution — an extra destination type, not a rerouting
of the existing one.

### How to apply

Any feature that reads "and then it goes to Telegram" is wrong unless the customer chose
Telegram. Check the default path first.

---

## D3 — Platform admin is an env allowlist, not a database column

**Date:** 2026-08-03
**Status:** active
**Applies to:** `lib/auth/admin.ts`, `/api/admin/diagnostics`, and the plan-granting
endpoint D2 calls for

### The decision

Platform administration — the operator of replie, as distinct from a workspace
owner — is defined by the **`ADMIN_EMAILS`** env var: a comma-separated allowlist.
`isCurrentUserPlatformAdmin()` is the single entry point. **The address must also
be `emailVerified`.**

### Why

D2 already established that `canManageWorkspace` cannot gate anything
platform-wide: every customer is OWNER of their own workspace, so that role gates
on nothing. Something had to represent the operator. An env allowlist because:

- **No migration.** Prisma migrations here carry the P3009 trap (HANDOFF.md), and
  this needed to exist before P1 rather than as part of it.
- **Not escalatable by a database write.** An attacker with SQL access still
  cannot make themselves an admin. A boolean column would be one `UPDATE` away.
- **Revoking is an env change**, not a data fix.

The verification requirement is load-bearing, not belt-and-braces. Signup refuses
an address that already exists, but an address that has *never* registered is
claimable by anyone — so without it, listing an unregistered address in
`ADMIN_EMAILS` would hand platform admin to whoever signs up with it first.

The email is read **from the database, not the session token**, because sessions
are JWT-backed and not revocable (D1), which makes the token the wrong source of
truth for an authorisation decision.

### How to apply

- Gate anything cross-tenant on `isCurrentUserPlatformAdmin()`. Never on
  `canManageWorkspace`.
- **The operator must have signed up and verified their email** before
  `ADMIN_EMAILS` does anything. An unset or empty value grants nobody — it fails
  closed.
- Changing admins requires an env change and redeploy. That is the accepted
  tradeoff for a single-operator product; revisit if staff ever need granting,
  at which point a `User.isAdmin` column plus an audit trail is the natural
  successor.

---

## D2 — Billing: admin-granted plans now, payment rails as soon as possible

**Date:** 2026-08-02
**Status:** active — the "now" half shipped 2026-08-04 (P1/P4); payment rails still pending
**Applies to:** `workspace.plan`, `lib/billing/grant.ts`, `lib/billing/plan.ts`,
the pricing page CTAs

> **Implemented.** `grantWorkspacePlan()` in `lib/billing/grant.ts` is the single
> writer of `workspace.plan`; `POST /api/admin/plan` is a thin caller gated on
> `isCurrentUserPlatformAdmin()` (D3). **A payment webhook calls the same
> function with `source: "PAYMENT_WEBHOOK"` and needs no other change** — that
> was the point of building the admin path first. Runbook in HANDOFF.md.

### The decision

**Now:** grant paid plans through an **admin-only endpoint**. Payment is collected
manually (customer contacts `t.me/ceo_syr`, owner confirms payment, owner grants the
plan). This unblocks charging without waiting on a payment integration.

**Next, and intended to become the default:** integrate a real payment provider —
**Click**, or Payme / Uzum — and move plan granting to the payment webhook. This is
wanted **as soon as it is practical**, not "someday". The manual path is a stopgap.

### Why

There is currently no code path that writes `workspace.plan` at all — every workspace
is `FREE` and can only be upgraded by hand-editing the database. The plan *gates* work
correctly (`canUseFeature` blocks tracked links, opening DMs, CSV import), so the
enforcement half of billing is built and the granting half does not exist. That is the
only thing standing between the pricing page and revenue.

Waiting for payment rails before being able to charge anyone would block launch on an
integration. Granting plans manually is operable for the first customers and buys time.

### How to apply

- Build the admin endpoint **so that swapping the trigger is cheap.** The plan-granting
  logic should be a function the endpoint calls, so a payment webhook can call the same
  function later without a rewrite.
- Do **not** reuse `canManageWorkspace` to gate it — that is workspace-scoped, and a
  workspace owner must not be able to grant themselves Pro.
- Record every plan change (who, when, which plan) so there is an audit trail. Manual
  billing without a trail becomes unrecoverable quickly.
- Assume a plan expiry field will be needed (see P4 in [FIX_BRIEF.md](../archive/2026-08-04-fix-brief.md));
  designing it in now is cheaper than retrofitting.
- When payment rails land, the manual endpoint should stay for support and refunds, but
  the webhook becomes the normal path.

Full finding and fix detail: **P1** and **P2** in [FIX_BRIEF.md](../archive/2026-08-04-fix-brief.md).

---

## D1 — Sessions are JWT-backed, not database-backed

**Date:** 2026-08-02
**Status:** active
**Applies to:** `lib/auth.ts`

### The decision

`session: { strategy: "jwt" }`. The `Session` table is vestigial.

### Why

This is forced, not preferred. `@auth/core`'s credentials branch always encodes a JWT
cookie and never writes a `Session` row, and it does not check the configured strategy.
Under `strategy: "database"` a password sign-in mints a cookie the session lookup
cannot resolve.

### How to apply

- The session callback reads `token.sub`, **not** `user.id`. Changing it back breaks
  `session.user.id` and with it every `getCurrentWorkspaceId()` call.
- Do not switch the strategy back to `"database"` without also removing the Credentials
  provider.
- **Accepted tradeoff:** sessions cannot be revoked server-side. Logout clears the
  cookie; a stolen token stays valid until expiry. This is tracked as an open item in
  [HANDOFF.md](../operations/handbook.md) and should be revisited before significant traffic.
