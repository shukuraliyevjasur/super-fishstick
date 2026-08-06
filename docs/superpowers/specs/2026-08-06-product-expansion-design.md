# Product Expansion — replie.uz
**Date:** 2026-08-06  
**Status:** findings only, no implementation started  
**Next:** filter → spec individual features → implement

---

## What replie is (context for agent)

Instagram DM automation SaaS for the Uzbek market. Core feature: user comments a keyword on an Instagram post → replie auto-DMs them. Built on Next.js 16 + Prisma 7 + BullMQ/Redis + GCP worker. Live at replie.uz, not yet open to real users. Three plans: Free / Pro / Agency (20 accounts, white-label reports).

Stack specifics that matter for features:
- Worker (`worker/dm-worker.ts`) is long-running on GCP, consumes BullMQ queue
- Meta webhook already wired (`lib/meta/webhook.ts`) — new trigger types are incremental
- Multi-account and multi-workspace already modelled in DB

---

## Market segmentation (Uzbekistan)

Three distinct layers, not one homogeneous market:

**Layer 1 — Targetologs**  
Run Meta ads for clients. Count ad stats as leads. Large population, mostly solo or small, many are newbies (<1k followers themselves). Low-medium budget. Primary value: anything that makes their lead numbers look better to clients.

**Layer 2 — SMMshiki** ← sharpest wedge  
Manage the full internet presence (posting, DMs, comments, stories) for 1–3 businesses. Small teams. Their client pays them, so they have budget. Overwhelmed by DM volume across multiple accounts. They need: inbox sanity + templates + automation + client reports.

**Layer 3 — Agencies**  
Formal digital agencies. Multi-person teams, multiple clients, need white-label + team seats + audit trails. Higher LTV but fewer of them. Agency tier already handles this.

**Primary pain confirmed:** Not the comment trigger itself — it's the DM flood that follows. A reel gets 200 comments and the same 200 people DM. Nobody can handle that manually across 5 client accounts.

**Discovery pattern (how customers find sellers):** Instagram reel → viewer DMs directly (most common) OR leaves a comment. Telegram is NOT a discovery channel — people search for known channels, don't browse. Telegram is a retention/notification layer.

---

## Competitor: ManyChat

Expensive, English/Russian-only, complex setup. Many Uzbek SMMshiki know it exists but haven't bought it. Price + language + local support = replie's wedge. ManyChat took 8 years to reach Instagram + Facebook + WhatsApp + Telegram + TikTok + SMS + Email. Don't copy breadth. Win on focus + localization.

---

## Meta API permissions map

Critical context: many features require App Review + Business Verification, which is not yet complete.

```
Available NOW (no App Review):
  ✓ Comment trigger → outgoing DM         (core feature, live)
  ✓ Public comment auto-reply             (respond to public comments on posts)

Requires instagram_manage_messages (App Review pending):
  ✗ Read incoming DMs
  ✗ DM keyword auto-reply (inbound)
  ✗ Unified DM inbox
  ✗ Story reply automation

Requires instagram_manage_comments (App Review pending):
  ✗ Comment moderation (hide/delete)
  ✗ Private comment reply
```

Do NOT build inbound DM features until App Review passes. Build around the blocker.

---

## Feature priority

### Ship now (no blockers)

| Feature | What it does | Why now |
|---|---|---|
| **Public comment auto-reply** | When post gets a comment → auto-reply publicly to that comment | No App Review. Extends existing comment webhook. |
| **Telegram bot automation** | Keyword triggers + auto-DM flows inside a Telegram channel/bot | Zero approval process. Telegram Bot API is fully open. Uzbekistan runs on Telegram. SMMshiki can sell Telegram funnels TODAY while Meta review is pending. |
| **Telegram lead ping** | New lead arrives → Telegram bot notifies the agency | 1 day of work. SMMshiki already live on Telegram all day. Instant ROI. |
| **Quick reply templates** | Manual: SMM worker opens DM, presses one button, sends pre-written answer | No API needed. Pure UX. Saves manual typing for repetitive questions (price, address, hours). |

### Ship after Meta App Review passes

| Feature | What it does |
|---|---|
| **DM keyword auto-reply** | Incoming DM contains keyword → auto-reply. Mirrors comment trigger but for DMs. |
| **Story reply automation** | User replies to a story → auto-DM them. Large surface area. |
| **Unified DM inbox** | All DMs from all connected accounts in one view. The core SMMshiki pain. |

### Bigger lift (plan separately)

| Feature | What it does | Note |
|---|---|---|
| **Conversation flow builder** | Visual multi-step: "price?" → show price → "want to order?" → if yes → payment link | ManyChat's core. High effort, high ceiling. Build after quick wins land. |
| **Lead CRM lite** | Track who came in, what stage they're at, mark converted, export CSV | Agencies will pay extra for this. |
| **Payme/Click in flows** | Payment link auto-sent in DM flow when user signals purchase intent | Uzbek payment rails. High conversion impact. |

### Don't build

| Feature | Reason |
|---|---|
| Broadcast DMs (mass DM to past engagers) | Meta bans accounts for this. Do not build. |
| Post scheduler | Commoditized. Buffer, Later, native Meta scheduler exist. |
| AI-powered auto-reply | Meta API restrictions + quality risk + cost. Revisit later. |
| Facebook / WhatsApp / TikTok | Premature diffusion. Win on Instagram + Telegram first. |

---

## Recommended build order

```
1. Public comment auto-reply      — extends existing webhook, fast win
2. Telegram lead ping             — 1 day, immediate agency value
3. Telegram bot automation        — buys sellable product while Meta review waits
4. Quick reply templates          — UX only, no API
5. [Meta review passes] → DM keyword auto-reply + story replies + DM inbox
6. Conversation flow builder      — spec separately when core is solid
```

---

## Open questions (not answered today)

- Meta App Review timeline / current status — check META_APP_REVIEW.md
- Telegram: build as separate product or unified replie workspace?
- Pricing: does Telegram automation go in existing Pro/Agency tiers or as add-on?
- Payment integration: which provider first — Click or Payme?
