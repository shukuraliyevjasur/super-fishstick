# Decisions

Durable product and architecture decisions for replie, with the reasoning behind them.

Read this before proposing an alternative to something listed here — these are settled
calls, not open questions. If you believe one should be reversed, say so explicitly and
explain what changed, rather than quietly doing something different.

Newest first. When a decision is superseded, keep the original and mark it, so the
history stays readable.

---

## D2 — Billing: admin-granted plans now, payment rails as soon as possible

**Date:** 2026-08-02
**Status:** active
**Applies to:** `workspace.plan`, `lib/billing/plan.ts`, the pricing page CTAs

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
- Assume a plan expiry field will be needed (see P4 in [FIX_BRIEF.md](FIX_BRIEF.md));
  designing it in now is cheaper than retrofitting.
- When payment rails land, the manual endpoint should stay for support and refunds, but
  the webhook becomes the normal path.

Full finding and fix detail: **P1** and **P2** in [FIX_BRIEF.md](FIX_BRIEF.md).

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
  [HANDOFF.md](HANDOFF.md) and should be revisited before significant traffic.
