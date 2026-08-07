> **ARCHIVED — not current.** Superseded by [../product/roadmap.md](../product/roadmap.md)
> and [../product/decisions.md](../product/decisions.md). If this file disagrees with those,
> they win. Context: [README.md](README.md). Kept for the reasoning, not the conclusions.

# Roadmap — replie

> ⚠️ **SUPERSEDED IN PART — read [docs/designs/telegram-expansion.md](../product/roadmap.md) first.**
>
> A CEO-mode plan review on 2026-08-07 overturned several calls below. Do not act on
> this file's sequencing without checking the design doc, which is canonical:
>
> - **Telegram is no longer Phase 3.** It moved to the front, and its scope grew
>   (conversational flows, Mini App reports, broadcast).
> - **A shared `@replie_bot` is the default**, not per-customer bots.
> - **Telegram lead ping (Phase 3.1) is cut.**
> - **The Meta tester cap is 50** — unmeasured when this was written. Treated as
>   temporary pilot capacity, not a design constraint.
> - Phase 0's follow-gate work is no longer headline scope.
>
> This file stays as the historical record and will be reconciled once the design doc
> clears eng and design review.

**Written 2026-08-07.** Derived from [DECISIONS.md](../product/decisions.md),
[FIX_BRIEF.md](2026-08-04-fix-brief.md), [HANDOFF.md](../operations/handbook.md), and
[docs/superpowers/specs/2026-08-06-product-expansion-design.md](2026-08-06-product-expansion.md).

Sequencing document, not a feature wishlist. The expansion spec decided *what* is worth
building; this decides what is *possible*, and in what order.

---

## The constraint, stated precisely

No legal entity → no Meta Business Verification → no App Review → **no Advanced Access,
indefinitely**. The same requirement blocks a Click merchant account, so payment rails
(P2) are blocked identically. Plans stay manual via `POST /api/admin/plan` (D2); payment
stays a Telegram transfer. Customers are onboarded by hand as Instagram testers, which
is why the target is SMM agencies and SMMshiki with many accounts, not SMBs — manual
onboarding costs the same per *customer* whether they bring 1 account or 15.

The decisive detail is **which side of the interaction needs the app role**.

HANDOFF's archived finding: messaging webhooks are dropped under Standard Access when
**the interacting user** has no role on the app. The interacting user is the random
follower who comments, taps, or DMs. You cannot predict or enrol them. So:

```
WORKS — comments webhook fires for ANY commenter, no role needed
  ✓ Comment → outgoing private-reply DM        (core, live)
  ✓ Public comment auto-reply                  (built)
  ✓ Tracked links, reports, quotas, rate limits (app-side, unaffected)

DEAD — every messaging webhook needs the follower to hold an app role
  ✗ messages / messaging_postbacks / messaging_seen
  ✗ Inbound DM keyword auto-reply
  ✗ Unified DM inbox
  ✗ Story reply automation
  ✗ Native postback buttons (how opening DM + follow gate were built)
```

**The 2026-08-04 Facebook Page finding was a confound.** `foundersyrio` was an Instagram
tester *and* had a Page linked; the Page was credited for what the tester role explains.
Treat FB Page linkage as irrelevant and drop it from onboarding — it is a step that buys
nothing.

**Everything this product can do must run on the comments webhook, the outgoing DM, or
Telegram.** That is the whole surface. Plan against it rather than against a review that
is not coming.

---

## Phase 0 — repair the follow gate · ~1 day

**First, what is not broken.** The default path already delivers the resource in DM #1:
`processComment`'s `else if (automation.trackedLinks.length > 0)` branch calls
`sendPrivateReplyWithLinkButton` with `buildLinkButtons(...)`, which points each button at
`/r/<slug>` → that link's own `destinationUrl` (any URL the campaign owner sets, up to
Meta's 3-button cap). That is a **`web_url` button template — no webhook involved** — and
it works in production today. The core comment→DM flow never depended on postbacks.

`sendPrivateReplyWithButton`, the postback-dependent call, is used in exactly two
branches: `useOpeningDm` and `sendFollowPrompt`. Those are the only casualties.

**The follow gate fails in the worst possible way and must be fixed.** In the
non-opening-DM branch, `getUserFollowStatus` runs at comment time, so *existing* followers
get their link immediately — that half works. Non-followers get the "follow me and tap
this" prompt, and tapping fires a dead postback. **Every user the gate was built to
capture is silently dropped.** The follow re-check has to happen at tap time, so
reveal-token is the only fix.

**Opening DM is not worth rebuilding — drop it.** It was a teaser whose button revealed
the link. Rebuilt on reveal-token it costs a webview round trip, competing against a path
that already delivers the same link in one tap with no sheet. Strictly worse than doing
nothing. A customer who wants teaser copy can put it in `dmMessage`, which already renders
as body text above the buttons.

**0.1 — Wire the reveal-token `web_url` button for `followcheck:`** · ~half day
`lib/meta/reveal-token.ts` (`signRevealToken` / `verifyRevealToken`) and
`app/api/reveal/[token]/route.ts` exist. In `processComment`, swap the postback button
for a `web_url` button pointing at `${APP_URL}/api/reveal/<signRevealToken(...)>`. The
endpoint verifies the HMAC and enqueues the same `process-postback` job — `processPostback`
is unchanged. **No webhook is involved:** the follower taps, their browser hits your
endpoint, the job runs. The role constraint never applies.

Worth knowing before starting: `buildLinkButtons` in `lib/queue/dm-worker.ts:55` already
has a fallback path for when Meta rejects a button template (line ~687 logs it and
degrades to an inline link), so the shape you need is already handled there.

**The interstitial is unavoidable here**, unlike for `reveal:`. The follow re-check is
async, so at tap time there is no destination to send them to yet — they get the "Check
your DMs" page, dismiss the sheet by hand, and the outcome (link, or "not following yet")
arrives in the thread behind it. One extra gesture versus the native postback. Acceptable
for the gated path; it is the reason opening DM is not worth the same treatment.

Do **not** spend time on `window.close()` — browsers refuse it for windows not opened by
script. The Messenger Extensions SDK (`requestCloseBrowser()`) is the only real auto-close
and is likely Messenger-only, not Instagram. Check it during the 0.1 test, but do not
design around it.

**0.2 — Un-hide the follow gate only** · ~1h
Restore the Follow Gate JSX in `components/campaign-builder.tsx` (~lines 759-761) and stop
hardcoding `requireFollow: false` in the save payload. **Leave `openingDmEnabled` hardcoded
`false`** and leave its UI hidden, per the reasoning above — and delete the dead
`useOpeningDm` branch in `processComment` rather than leaving a path nothing can reach.
Do **not** gate any of this on FB Page linkage; that was the confound.

**The gate stays per-campaign optional** — `requireFollow Boolean @default(false)` already
is that, so no schema work. But it must be an *informed* choice: the toggle needs one line
of helper text saying the gate adds a step (tap → browser sheet → dismiss → DM) and will
convert worse than sending the link directly. Without it, agencies switch it on because
ManyChat has it, watch conversion drop, and blame the product. i18n keys in both locale
files, same as every other builder string.

**0.3 — Follow gate prompt text (P5) + link button label (P6)** · ~5h combined
Both UI-only. P5's schema and worker are done and its i18n keys already exist in both
locale files; it un-defers with 0.2. P6's `linkButtonLabel` is **already on `Automation`**
([prisma/schema.prisma:183](prisma/schema.prisma:183)) — FIX_BRIEF's "add a migration" step
is stale, only the builder input remains.

**P6 is the higher-value half and is independent of everything above**, because
`buildLinkButtons` uses `linkButtonLabel` as the primary button title on the path that
already works. "Get the price" instead of "Havolani ochish" on every live campaign, for
~2h and no Meta dependency. Ship it first if 0.1 stalls.

**Verify the way HANDOFF says:** comment the keyword from an account with **no app role**,
tap the button, confirm a `reveal:` row lands in `DmLog`. A test from a role-holding
account proves nothing here.

---

## Phase 1 — probe what is left on the comment surface · ~2h

Two cheap unknowns. Both are lookups, not builds, and both change what Phase 2 contains.

**1.1 — Does comment moderation (hide / delete) work?** · ~1h
The expansion spec files this under "requires `instagram_manage_comments`, App Review
pending" — but **public comment auto-reply already works in production**, and it uses
`instagram_business_manage_comments`. So that permission is functional at Standard
Access. Hiding and deleting may already work. Test it against one connected account.

If it works it is a genuine agency feature — spam and competitor comments hidden across
ten client accounts — and it lives entirely on the surface that is not blocked. Treat
this as a test, not a plan: the spec's claim may still be right for the write scopes.

**1.2 — What is Meta's cap on Instagram testers / app roles?** · ~1h
Every customer account is added under **Review → Testing → Generate access tokens →
Add account**. That cap is the **maximum number of Instagram accounts this business can
ever serve** under the current model. It is a business input, not a technical detail —
it decides whether the ceiling is 50 accounts or 500. Look it up before building a sales
pipeline against it.

---

## Phase 2 — build for the agency, on the surface that works

None of this touches Meta approval. This is where the segment change shows up in the
product: an agency running ten client accounts has problems a single business never has.

**2.1 — Campaign clone / bulk apply across accounts** · ~3 days · **biggest win**
`Automation` is 1:1 with `instagramAccountId`. An agency running the same "comment PRICE"
funnel for ten clients builds it ten times and edits it ten times. Single most
agency-specific pain in the product, pure app-side work.

Check `app/api/automations/import/route.ts` first — it already does bulk creation, is
already plan-gated, already carries the shared URL validator, and **has no caller in the
app** (S5). Likely the foundation rather than a new path.

**2.2 — Cross-account rollup and client reports** · ~2 days
The dashboard filters to one account; an agency wants all ten at once plus a per-client
breakdown they can hand over. White-label reports already exist on the Agency tier and
share slugs are already unguessable (`randomBytes(9)`), so this is aggregation work on
existing infrastructure, not new plumbing.

**2.3 — Comment moderation** · ~2 days · *only if 1.1 succeeds*
Hide or delete matching comments per campaign, across accounts. Skip entirely if the
probe fails.

---

## Phase 3 — Telegram, now the only two-way surface

This changes priority, not just scope. Telegram was framed as diversification in the
expansion spec. With every inbound Instagram messaging path dead, **it is the only
conversational surface available at all** — the only place a follower can send something
and get an automated answer. That makes it the strategic centre, not a hedge.

**3.1 — Telegram lead ping** · ~1 day
New lead → Telegram bot messages the workspace owner. Agencies live in Telegram all day.
Reuses the existing worker and `DmLog` write path; new surface is one bot token per
workspace and one outbound call. Cheapest real value on this page and it demos in a sales
DM. Ship before 3.2.

**3.2 — Telegram bot automation** · ~1 week
Keyword trigger → auto-reply flow inside a Telegram bot. No approval process, fully open
Bot API, and Uzbekistan runs on Telegram. This is the two-way automation Instagram cannot
give you, and the only thing on this roadmap that reduces dependence on a single platform
decision.

**Unified in the existing workspace, not a separate product.** `Workspace` /
`Automation` / `DmLog` / plan gates already generalise; add `TelegramBot` alongside
`InstagramAccount` and reuse the BullMQ queue. A separate product means a second auth
system, second billing path, second deploy target.

**Pricing: existing tiers, not an add-on.** Add-ons need metered billing, which needs
payment rails, which are blocked. Manual granting can only express "which plan". Lead
ping in FREE as the hook, bot automation in STANDART and up.

---

## Phase 4 — reduce onboarding cost

Onboarding is a human process: operator adds the account as a tester, customer accepts
the invite in Instagram settings, customer completes OAuth. Three steps, two outside the
product. (Not four — the FB Page step is gone, see the constraint section.)

With manual onboarding, time-per-account is the growth constraint, so this compounds —
but it ranks below Phase 2 and 3 because there is nothing to onboard *into* yet at
volume. Revisit its position after the first three agencies.

**4.1 — Per-account onboarding checklist in-app** · ~2 days
Visible state machine: tester invite sent → invite accepted → OAuth connected. The
customer sees which step they are stuck on instead of DMing you.

**4.2 — Operator view of stuck accounts** · ~1 day
Which accounts sit at which step, across all workspaces. Platform-admin gated
(`isCurrentUserPlatformAdmin()`, D3 — **not** `canManageWorkspace`). Extend the existing
diagnostics surface rather than building a new one; S2 already split that route per-field
between workspace and platform-admin data, so follow that pattern.

**4.3 — Pick the canonical host** (Q4) · 5 min, operator
Make the apex `replie.uz` primary in Vercel. `APP_URL` is already the apex so no code
change. Every tracked link in every DM already sent currently pays a 308 hop.

---

## Not on this roadmap

- **Inbound DM keyword auto-reply, unified DM inbox, story replies** — not deferred,
  **structurally impossible** under Standard Access. They need an app role from a person
  you cannot identify in advance. They return only with a legal entity → verification →
  App Review. Do not spec them.
- **Payment rails** (P2) — blocked on a Click merchant account, blocked on the same legal
  entity. Manual Telegram payment + `POST /api/admin/plan` works and is not the
  bottleneck at this scale.
- **Rewriting [META_APP_REVIEW.md](../reference/meta-app-review.md)** — stale three ways (3 permissions
  listed vs 4 requested, magic-link script vs password signup, says "OpenReply"). ~1h,
  but only when a submission is actually close. It will be stale again by then.
- **Quick reply templates** — the expansion spec framed this as "open a DM, tap one
  button, send a pre-written answer". You cannot read DMs, so that version cannot exist.
  A copy-to-clipboard snippet library is what remains, and it is marginal. Dropped.
- **Lead CRM lite, conversation flow builder, payment links in flows** — right ideas,
  wrong time. Revisit once agencies actually use 2.1 and 2.2.
- **Broadcast DMs** (Meta bans accounts), **post scheduler** (commoditised), **AI
  auto-reply**, **Facebook / WhatsApp / TikTok** — per the expansion spec's "Don't build".
- **Session revocation** (HANDOFF item 5), **second worker VM** (C4) — real, tracked, not
  worth the work before there is traffic to protect.

---

## Standing risks

1. **The whole product rests on one webhook.** `comments` is the only Meta event that
   reaches you. If Meta narrows it the way it narrowed messaging, there is no product
   left on Instagram. That is the real argument for Phase 3, and why it should not slip.
2. **The tester cap is an unknown business ceiling.** 1.2 exists because the answer might
   be small enough to change strategy. Do not build a pipeline against a number nobody
   has looked up.
3. **Zero real users as of 2026-08-07**, live since 2026-07-31. Phase 2 and 3 ordering is
   inference from the expansion research, not usage. The first three agencies onboarded
   should be allowed to reorder both.
4. **Worker failure is still under-alerted.** C1 is fixed for worker *death*, but a worker
   that is alive and failing every send still reports healthy — `buildHealthReport()` only
   degrades when a check throws. `recordWorkerAlert()` already writes every failure to
   Redis and nothing reads it for alerting. Add a failed-job threshold to `checkQueue()`
   before the first agency depends on this.
5. **Connection pool headroom.** `max: 1` is per-instance; enough concurrent Vercel
   instances still hit Supabase's 15-client cap. Move to the transaction-mode pooler
   (port 6543) — a connection-string change — before multi-account agencies generate real
   traffic.
