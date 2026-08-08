# TODOs

Deferred work, with enough context to pick up cold. Not a backlog of ideas — only
things that were considered, decided against *for now*, and given a trigger for when
to revisit.

Settled decisions live in [DECISIONS.md](decisions.md). Open review findings live in
[FIX_BRIEF.md](../archive/2026-08-04-fix-brief.md). Sequencing lives in [ROADMAP.md](roadmap.md).

---

## T-1 — Telegram Payments inside the bot flow (E5)

**Priority:** P3
**Effort:** L (human) → M (with CC)
**Depends on:** E2 conversational flows shipped; ideally P2 payment rails first
**Trigger to revisit:** an agency asks for it by name, **and** replie's own payment
rails exist

**What.** Let a customer's Telegram bot charge money inside the chat — the lead taps
Buy, pays, and never leaves the conversation. This is for the agency's client's
customers, not for replie's own billing.

**Why it's wanted.** The highest-conversion feature available on the Telegram Bot API,
and nothing in the API blocks it. It closes the loop from reel to payment with no
handoff.

**Why it's deferred.** The blocker is not code. Telegram Payments needs a payment
provider token **per client**, which means every client sets up their own merchant
account and hands over a credential. That adds per-client merchant onboarding to a
product whose central problem is already that onboarding is manual — see
[docs/designs/telegram-expansion.md](roadmap.md). It is also
awkward to sell payment collection to customers before replie itself can take payment
(P2 in FIX_BRIEF is blocked on the same missing legal entity).

**Where to start.** Telegram's `sendInvoice` / `answerPreCheckoutQuery` /
`successful_payment` update flow. The flow engine from E2 is the natural host — a
payment step is just another step type. Decide first whether replie stores the client's
provider token (same AES-256-GCM path as bot tokens) or hands off to a link.

**Decided:** 2026-08-07, CEO review, scope item E5 — DEFERRED (not rejected).

---

## T-2 — Rewrite META_APP_REVIEW.md before submitting to Meta

**Priority:** P2
**Effort:** S (human) → S (with CC)
**Depends on:** a legal entity (YaTT or equivalent) existing
**Trigger to revisit:** the moment business verification becomes possible — **not
before**, because the doc will re-stale in the meantime

**What.** [META_APP_REVIEW.md](../reference/meta-app-review.md) is the App Review submission script.
It is stale in three specific ways and **will fail review as written**:

1. **It lists 3 permissions; the code requests 4.**
   `instagram_business_manage_insights` is missing from the doc and is real — it powers
   the overview page, and the callback log confirms Instagram grants it. Either justify
   it or drop the scope and the feature.
2. **The screencast script says "sign in with an email magic link."** Signup is now
   email + password; the magic link is the fallback. Reviewers follow the script
   literally.
3. **It says "OpenReply" throughout**, not replie.

**Why it matters more than it used to.** Business Verification does not only unlock
App Review. Per Meta's App Roles documentation, an app **not** linked to a verified
Business is capped at **50 testers**; a linked and verified one gets **500**. Since every
customer account must currently be added as a tester, that cap is the number of Instagram
accounts replie can serve. Verification is therefore a 10x on customer ceiling *and* the
path to Advanced Access, not just the latter.

**Owner's position (2026-08-07):** the 50-cap is temporary and should not be designed
around. This TODO is how it stops being temporary.

**Where to start.** [HANDOFF.md](../operations/handbook.md) § "Meta verification status" has the
current state, including that Tech Provider status is already granted and that
Review → Verification must be completed *before* drafting App Review justifications.

**Decided:** 2026-08-07, CEO review — DEFERRED with an explicit trigger.

---

## ~~T-3 — Document the Telegram preview panel as a design-system exception~~ Done 2026-08-08

**Done with D8.** The exception is stated at the top of
`components/flows/flow-preview.tsx` itself, in the same shape
`components/campaign-preview.tsx` uses, including the "do not fix this" instruction and
the reason. Put in the file rather than only in a doc, because the file is what a future
agent opens when it decides the raw hex values look like a mistake. The exception stops at
the edge of the chat window — the panel border and heading stay on tokens.

Still worth doing the handbook half below if the design-system section is ever the
first thing someone reads.

**Priority:** P2 · **Effort:** S → S · **Blocked by:** nothing · **Needed by:** S3 (flow editor)

**What.** The flow editor's live preview renders a Telegram-styled chat (dark surface,
asymmetric bubble radii, Telegram's blue). That breaks the closed token scales in
`app/globals.css` on purpose.

**Why.** There is already exactly this precedent: `components/campaign-preview.tsx` uses dark
zinc and `rounded-2xl` to mimic Instagram, and [HANDOFF.md](../operations/handbook.md) §Design system
records it as a documented exception with "Do not 'fix' it." Without the same treatment, a
future design review or agent session will 'correct' the Telegram preview into token
compliance and it will stop looking like Telegram.

**Where to start.** Add a second bullet under the existing Exception line in HANDOFF.md
§Design system naming the flow-editor preview component.

**Decided:** 2026-08-07, design review Pass 5.

---

## T-4 — Name the three new components before the editor is built

**Priority:** P2 · **Effort:** S → S · **Needed by:** S3

**What.** The flow editor introduces a step card, a branch chip, and a breadcrumb. None has
a precedent in the app today.

**Why.** Components named at typing time do not get reused. The campaign builder is being
decomposed into section components in the same work (eng Issue 5) — that is the moment to
agree a shared vocabulary rather than grow a second one beside it.

**Where to start.** Decide names alongside the campaign-builder decomposition so both use
the same primitives.

**Decided:** 2026-08-07, design review Pass 5.

---

## T-5 — Keyboard reordering of flow steps

**Priority:** P2 · **Effort:** M → S · **Needed by:** S3

**What.** Steps in the flow editor need to be reorderable without a mouse.

**Why.** The drill-in transition already got proper focus management and a live-region
announcement (design review Issue 6), so the editor is otherwise keyboard-navigable.
Reordering being drag-only would be the one place that breaks, and accessibility is not
optional on new codepaths.

**Where to start.** Move-up / move-down controls on each step card are enough; a full
drag-and-drop keyboard protocol is not required.

**Decided:** 2026-08-07, design review Pass 7.

---

## T-6 — Design the Flows list screen

**Priority:** P2 · **Effort:** M → S · **Needed by:** S3

**What.** Flows are a top-level section (design review Issue 1), which means there is a
screen listing them. It has no design.

**Why.** The whole argument for top-level flows is that they are reusable assets — build a
price-enquiry funnel once, point ten campaigns at it. If the list ships as a bare table,
that value is invisible and people will keep building one flow per campaign anyway. This is
also where the validation warnings from Issue 5 surface at a glance.

**Where to start.** Show, per flow: which campaigns use it, when it last ran, and whether it
has structural warnings.

**Decided:** 2026-08-07, design review Pass 7.

---

## T-7 — Read-only canvas view for the flow editor

**Priority:** P3 · **Effort:** L → M · **Depends on:** S3 shipped and in use

**What.** A view toggle that renders the whole flow as a node graph. Read-only — all editing
stays in the list.

**Why.** The known weakness of the drill-in model is that you never see the whole flow at
once. A read-only canvas answers that without taking on canvas *editing* (pan, zoom, node
overlap, edge routing, auto-layout), which is what made the full canvas cost four weeks.

**Risk to watch.** Two interaction models to keep consistent. This is the one most likely to
be started and left half-finished — do not begin it until the list editor has real users.

**Decided:** 2026-08-07, design review — deferred at the editing-model decision.
