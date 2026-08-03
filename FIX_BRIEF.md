# Fix brief — replie pre-launch review

**Generated 2026-08-02.** Every finding from a four-phase review (security, live QA,
code gaps, product gaps). Written to be executed by someone with no prior context.

19 findings, 4 HIGH.

**Status.** Fixed so far (all 2026-08-03): **S1 S2 S3 S4 S5** — every security
finding is closed — plus **C1 C3** and **Q1 Q2 Q3 Q5 Q6**. **Q4** is code-complete
but needs an operator action (which host is canonical).

**Open: 6** — P1, P2, P3, P4, C2, C4. Each finding below carries its own status
line.

Source documents, if you want the reasoning behind a finding:
[SECURITY_AUDIT.md](SECURITY_AUDIT.md), [LAUNCH_REVIEW.md](LAUNCH_REVIEW.md).
Project background: [HANDOFF.md](HANDOFF.md).

---

## What this project is

replie is a paid SaaS for the Uzbek market. It automates Instagram comment-to-DM:
a follower comments a keyword on a connected professional account's post, and replie
sends them a private reply. Next.js 16 + Prisma 7 + Postgres (Supabase) + BullMQ/Redis,
with a long-running worker on a GCP VM. Deployed and live at `replie.uz`, not yet open
to real users.

---

## Read this before touching anything

These will cost you hours if you find them the hard way. All are documented in
HANDOFF.md; repeated here because they are easy to trip over.

### Never run `npm install` on Windows

It silently breaks CI. It floats hoisted `@emnapi/core` / `@emnapi/runtime` off
1.10.0, which `@rolldown/binding-wasm32-wasi` pins exactly. The result installs fine
locally and fails `npm ci` on Linux.

**Before committing, always run `git diff package-lock.json`.** If you did not
intend a dependency change, discard it with `git checkout HEAD -- package-lock.json`.
If the lockfile genuinely must change, generate it on Linux (WSL, the GCP VM, or CI).

**Several fixes below are deliberately written to add zero dependencies for this reason.**

### Prisma 7 keeps the datasource URL in `prisma.config.ts`, not `schema.prisma`

Adding `url = env("DATABASE_URL")` to the schema's datasource block breaks the build
with P1012.

Local commands need a dummy URL, e.g.
`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate`.

Never apply a migration by hand in the Supabase SQL editor without also inserting its
row into `_prisma_migrations` — otherwise the next deploy re-applies it, fails,
records a *failed* migration, and blocks every later deploy with P3009.

### `t()` must be imported from `lib/i18n/t.ts` in server components

`components/dictionary-provider.tsx` is a `"use client"` module. Anything exported
from it — including a pure helper — becomes a client reference, and calling it from a
server component throws at render time. This already shipped once and 500'd
`/[lang]/login?template=<slug>`.

- Server component: `import { t } from "@/lib/i18n/t"`
- Client component: either import works

### The middleware matcher is load-bearing

`proxy.ts` prefixes every unprefixed path with a locale. Anything with no page under
`app/[lang]/` **must** stay excluded from `config.matcher` or it redirects into a 404.
Currently excluded: `/api/*`, `/r/*`, `/reports/*`, `robots.txt`, `sitemap.xml`.

`/r/*` matters most — `lib/tracking/message.ts` bakes `${APP_URL}/r/<slug>` into every
DM already sent, so those URLs cannot change retroactively. This regressed once and
every tracked-link click 404'd with no clicks recorded.
`__tests__/proxy-matcher.test.ts` guards it. Do not weaken that test.

### Instagram code 100 means the account is not linked to the app

If any `graph.instagram.com` call returns
`code 100 — Unsupported request - method type: get`, the request is almost certainly
fine and the **Instagram account is not attached to the Meta app**. Add it under
Meta dashboard → Use cases → Instagram API setup → Generate access tokens → Add account.

A *fake* token returns 190 instead, so curl probes report the endpoint as healthy and
cannot reproduce it. This cost six deploys and two wrong fixes. Do not start
permuting URLs or HTTP methods.

### Sessions are JWT, and that is forced

`@auth/core`'s credentials branch always encodes a JWT cookie and never writes a
`Session` row, ignoring the configured strategy. Under `strategy: "database"` a
password sign-in mints a cookie the session lookup cannot resolve. So `lib/auth.ts`
uses `strategy: "jwt"`, the session callback reads `token.sub` (not `user.id`), and
the `Session` table is vestigial. **Do not switch the strategy back** without also
removing the Credentials provider.

---

## Verification protocol

Run **before** you start (to confirm a clean baseline) and **after every finding**:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
npm run typecheck
npm run lint
npm test
```

Expected clean baseline as of 2026-08-02: typecheck silent, lint **0 errors**
(304 warnings are pre-existing and fine), **125 tests passing across 16 files**.

Before committing:

```bash
git diff package-lock.json   # must be empty unless you intended a dependency change
```

CI runs typecheck → lint → test → build, and fails fast, so a typecheck error hides
every lint and test result behind it.

---

## Findings

Ordered by what would hurt most. Tier 1 blocks launch; Tier 2 should land before real
users; Tier 3 is cleanup.

---

# TIER 1 — blocks launch

## P1 (HIGH) — A paid plan cannot be granted through the product

**Where:** `prisma/schema.prisma:79` (`plan WorkspacePlan @default(FREE)`), and the
absence of any writer.

**Problem.** No route, job, or admin screen ever writes `workspace.plan`. Verified by
searching every write to that field across `app/`, `lib/` and `worker/`: there are
none. Every workspace is created `FREE` and can only be upgraded by hand-editing the
database.

The gates themselves work — `canUseFeature` in `lib/billing/plan.ts` correctly blocks
tracked links, opening DMs, and CSV import by plan. So the *enforcement* half of
billing is built and the *granting* half does not exist. This is the one thing between
the pricing page and charging anyone.

**Consequence.** Upgrading a customer means opening Supabase and running an `UPDATE`.
No audit trail of who upgraded whom, no downgrade on non-payment, no expiry.

**DECIDED — build the admin endpoint (option a).** Recorded as D2 in
[DECISIONS.md](DECISIONS.md). Payment is collected manually for now (customer contacts
`t.me/ceo_syr`, owner confirms, owner grants the plan). Payment rails follow **as soon
as practical** and then become the default path — see P2.

Add `planGrantedAt`, `planGrantedBy` and `planExpiresAt` to `Workspace`, write an
admin-gated route, and log every change to `OperationalEvent` so there is a trail.

Three constraints that matter:

- **Put the plan-granting logic in a function the route calls**, not inline in the
  route. A payment webhook must be able to call the same function later without a
  rewrite. This is the whole point of doing (a) first.
- **Do not reuse `canManageWorkspace`** to gate the route — it is workspace-scoped, and
  a workspace owner must not be able to grant themselves Pro.
- **Design in `planExpiresAt` now** even if nothing reads it yet; P4 needs it and
  retrofitting a billing field later is worse.

**Verify:** a non-admin gets 403; a workspace owner cannot self-grant; a plan change
appears in `OperationalEvent`; `canUseFeature` immediately reflects the new plan.

## C1 (HIGH) — Worker death is silent, and DMs stop for everyone — ✅ FIXED 2026-08-03

**Fixed.** `/api/cron/health-check` runs the shared checks
(`lib/ops/health-report.ts`, now also used by `/api/health`) and emails
`ALERT_EMAIL` via Resend's REST API when degraded. Registered in `vercel.json` at
07:00 UTC.

**The daily limit is real and accepted, not papered over.** Vercel's free tier
fires crons once a day, and there is no plan to upgrade. A worker dying just
after a run stays dead ~24h. The daily cron is a backstop; an external monitor
(cron-job.org — 1-minute intervals *and* custom headers on the free tier) is the
actual detection path. Documented under "Health alerting" in HANDOFF.md, along
with why UptimeRobot's free tier cannot be used here.

**Still requires an operator action:** `ALERT_EMAIL` must be set on Vercel or no
email is sent.

Note the brief's claim that Resend "is already a dependency" was inaccurate — only
`next-auth/providers/resend` is installed, not the `resend` SDK. `lib/ops/alert-email.ts`
calls the REST API with `fetch`, so this still added zero dependencies.


**Where:** `app/api/health/route.ts`, `lib/ops/worker-health.ts`, `vercel.json`.

**Problem.** `/api/health` already checks database, Redis, queue depth and worker
heartbeat, and returns **503** when degraded. **Nothing calls it.** `vercel.json`
defines only two crons (`refresh-tokens`, `attach-next-reel`). `recordWorkerAlert()`
writes to Redis and the only consumer is `/api/admin/diagnostics`, a page a human has
to open.

**Consequence.** The worker stops (VM reboot without Docker restart, OOM, crash loop).
Jobs pile up in Redis. Every customer's comment-to-DM silently stops. The first signal
is a complaint, and by then it is churn.

**Fix.** The plumbing exists; it needs a consumer.

1. Add a Vercel cron hitting a new `/api/cron/health-check` (Vercel free tier fires
   crons **once per day** — accept that, or use an external uptime monitor for
   minute-level granularity; say so rather than pretending daily is enough).
2. That route calls the same checks and, when degraded, sends an email via Resend
   (already a dependency — `RESEND_API_KEY`, `EMAIL_FROM` are configured).
3. Gate it on `CRON_SECRET` the same way the other crons are, but **read S1 first** —
   do not copy the existing fallback pattern.

**Verify:** stop the worker container, wait for the cron (or invoke the route with the
bearer token), confirm an email arrives and the response is 503.

## S1 (HIGH) — Cron auth falls back to the JWT signing key — ✅ FIXED 2026-08-03

**Fixed** in `cb52797` / `c346cbf`. The fallback is gone from both routes and the
fail-closed check now lives in `requireCronAuth` (`lib/ops/cron-auth.ts`), shared
with `/api/health` and the new health-check cron. Guarded by
`__tests__/cron-auth.test.ts`. Note the check is `!cronSecret || header !== ...`:
dropping only the `||` clause would leave an unset secret comparing against the
string `Bearer undefined`.


**Where:** `app/api/cron/refresh-tokens/route.ts:10`,
`app/api/cron/attach-next-reel/route.ts:22`.

```ts
const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
```

**Problem.** `NEXTAUTH_SECRET` signs every session JWT. Anyone holding it can forge a
session for any user, without a password. This fallback puts it in an
`Authorization: Bearer` header on every cron invocation — into Vercel's cron config,
request logs, and any proxy in between.

Latent today because `CRON_SECRET` is set. It activates silently the moment that env
var is removed, renamed, or lost in a project migration.

**Fix.** Delete the fallback in both files. Require `CRON_SECRET` and let the route
401 without it. A failing cron is an alert; a cron quietly authenticating with the
signing key is not.

Consider extracting a shared `requireCronAuth(request)` helper so the next cron route
cannot reintroduce the pattern — C1 adds one.

**Verify:** with `CRON_SECRET` unset the route returns 401 rather than accepting
`NEXTAUTH_SECRET`.

## P2 (HIGH) — No payment integration

**Where:** `app/[lang]/pricing/page.tsx` — every paid CTA is
`https://t.me/ceo_syr?text=...`.

**Problem.** No payment rails. For the Uzbek market the expected options are **Click**,
Payme, or Uzum. Manual invoicing over Telegram is a legitimate way to start, but it is
only operable once P1 exists.

**Wanted as soon as practical, and intended to become the default** once it lands —
the manual admin path from P1 is explicitly a stopgap (D2 in
[DECISIONS.md](DECISIONS.md)). When rails ship, the payment webhook calls the same
plan-granting function the admin route uses; keep the admin route for support and
refunds.

**Depends on P1.** Do not start here.

---

# TIER 2 — before real users

## S3 (MED) — Open redirect on `replie.uz/r/*` — ✅ FIXED 2026-08-03

**Fixed.** `lib/validation/url.ts` holds `isHttpUrl` / `httpUrlSchema` /
`httpUrlOrEmptySchema`, applied to `postUrl`, `trackedDestinationUrl` and
`secondaryDestinationUrl` across the create schema, the update schema, and the
CSV import route.

**Also guarded at the redirect**, which the brief did not ask for and which
matters: schema validation only protects *new* writes. Rows stored while
`z.string().url()` accepted any scheme are still in the production database, and
their `/r/<slug>` links are already in recipients' inboxes and cannot be
recalled. `app/r/[slug]/route.ts` now re-checks the stored value and sends the
visitor to the homepage instead. The click is still recorded — it is the
customer's data and the visitor really did click.

**Private / link-local hosts are deliberately not blocked.** The brief listed it
as optional; it is declined because nothing server-side fetches these values —
they go to the visitor's browser — so there is no SSRF to prevent. Reasoning is
recorded in `lib/validation/url.ts`; revisit if any of these URLs ever becomes
something the server fetches.

Note that scheme validation does **not** stop the actual attack in the finding,
and must not be mistaken for a fix that does: `https://evil.example/phish` is a
valid http URL and is still accepted. What closes the phishing-laundering risk is
host-level policy or abuse response, not this. This fix removes the non-http
classes and makes the value type-safe at every entry point.


**Where:** `app/api/automations/route.ts:46` and `:103` (create and update schemas),
`app/api/automations/import/route.ts`, consumed at `app/r/[slug]/route.ts:42`.

**Problem.** `z.string().url()` has no scheme or host allowlist. Verified acceptance:

```
true   https://evil.example/phish
true   javascript:alert(1)
true   data:text/html,<h1>x
true   file:///etc/passwd
true   http://169.254.169.254/latest/meta-data/
```

`app/r/[slug]/route.ts:42` passes the stored value straight into
`NextResponse.redirect()`.

**Consequence.** An attacker signs up, pays for Standard (~47k UZS), creates a campaign
whose `destinationUrl` is a phishing page, and gets `https://replie.uz/r/<slug>`
pointing anywhere — DM'd to third parties from your own domain. Risk is phishing
laundering under your brand and `replie.uz` getting flagged by Safe Browsing or Meta,
which breaks every legitimate customer's links at once.

`javascript:` is **not** the risk (browsers do not execute it from a `Location`
header). An ordinary `https://` attacker host is.

**Fix.** Add a shared URL validator that requires `http:` or `https:`, and apply it to
`trackedDestinationUrl`, `secondaryDestinationUrl`, and `postUrl` in **both** the JSON
route and the CSV import route. Zod supports a refinement:

```ts
const httpUrl = z.string().url().refine(
  (v) => { try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } },
  { message: "Only http(s) links are allowed" }
);
```

Optionally also reject `169.254.169.254` and other link-local / private hosts.

**Verify:** add a test asserting `javascript:`, `data:`, and `file:` are rejected and
`https://` is accepted. This closes S5 at the same time.

## S2 (MED) — `/api/admin/diagnostics` is not admin-only — ✅ FIXED 2026-08-03

**Fixed by scoping, not by gating the route** — the brief offered either, and
gating turns out to be wrong here: despite the `admin` in its path, this route
backs a page in the **ordinary customer sidebar** (`components/sidebar.tsx`).
Gating the whole route would have deleted a customer feature.

So the split is per-field. Workspace-scoped data (webhook, DM and token failures)
stays open to the workspace. Platform-admin only: queue depth, worker alerts —
which carry *other tenants'* job and comment ids — worker heartbeat internals
(pid, hostname), and the system-wide `{ workspaceId: null }` events. Customers
still see worker `healthy` true/false, which is legitimately their business.

`payload` is still not selected on the system-wide query, and there is now a test
asserting it stays that way.

**This finding forced the platform-admin decision that P1 also needs.**
`lib/auth/admin.ts` / `isCurrentUserPlatformAdmin()`, recorded as **D3** in
[DECISIONS.md](DECISIONS.md). Read it before P1 — D2 says not to reuse
`canManageWorkspace` but does not say what to use instead; D3 is the answer.

**Requires an operator action:** set `ADMIN_EMAILS` on Vercel, and the account
must have a **verified** email or the entry does nothing.


**Where:** `app/api/admin/diagnostics/route.ts:10`.

**Problem.** The route is named `admin` but the only check is `getCurrentWorkspaceId()`,
which any signed-up user passes. Most queries are workspace-scoped; three are not:
`getDMQueue().getJobCounts()`, `getWorkerHealth()` / `getWorkerAlerts(10)`, and the
`operationalEvents` query, which explicitly includes `{ workspaceId: null }` —
system-wide events belonging to no tenant.

Webhook body previews do **not** leak: `payload` is not selected on that global query.
Do not widen the select while fixing this.

**Fix.** Either gate the whole route on an admin role, or scope the three global
queries to the caller's workspace. If the diagnostics page needs global data for the
operator, that is an argument for a separate admin surface (see P1, which needs one
anyway).

**Verify:** a fresh non-admin account gets 403.

## C2 (MED) — No error tracking

**Where:** `package.json` — the only observability dependency is `@vercel/analytics`
(page views).

**Problem.** A production exception is only visible by grepping Vercel logs. Concrete
cost: diagnosing the Instagram linking failure on 2026-08-02 took six deploys, much of
it reading log lines by hand and adding temporary instrumentation to capture request
detail a tracker would have caught on the first occurrence.

**Fix.** Add Sentry (or equivalent). **This adds a dependency — read the Windows
lockfile warning above and generate the lockfile on Linux.** Wire it into the API
routes, the worker, and the Next.js error boundaries.

## C3 (MED) — Token-refresh failures are recorded but never surfaced — ✅ FIXED 2026-08-03

**Fixed** as part of C1. `getRecentTokenRefreshErrors()` reads `TOKEN_REFRESH` /
`ERROR` events from the last 26 hours (wider than the daily cron interval, so a
failure is not missed between runs) and the health cron emails them **even when
the system is otherwise healthy** — a broken refresh is not a degraded state, but
it is silent until every connected account drops at the 60-day mark.


**Where:** `app/api/cron/refresh-tokens/route.ts`.

**Problem.** On failure the cron writes an `OperationalEvent` with
`source: TOKEN_REFRESH, level: ERROR`, readable only through the diagnostics page.
Combined with C1, nobody is notified.

Not hypothetical: `refreshLongLivedToken` was calling a versioned URL Meta rejects
(fixed 2026-08-02), so the cron was failing silently. The first visible symptom would
have been every connected account dropping at the 60-day mark, months later, with no
obvious cause.

**Fix.** Falls out of C1 — have the health/alert path also report recent
`TOKEN_REFRESH` errors, or email on any refresh failure.

## Q1 (MED) — `<html>` has no `lang` attribute — ✅ FIXED 2026-08-03

**Fixed, but not by the header approach the brief suggested.** Setting `x-locale`
in `proxy.ts` and reading it with `headers()` works, but `headers()` is a
request-time API: it would have opted **every** page — landing and pricing
included — into dynamic rendering, to add one attribute.

Instead the root layout moved into `app/[lang]/layout.tsx`, which the Next docs
name for exactly this case: *"The root layout can be under a dynamic segment,
for example when implementing internationalization with `app/[lang]/layout.js`."*
`lang` is then a route param, known statically.

`app/reports/layout.tsx` is a second root layout for the share links that cannot
carry a locale (multiple root layouts are supported when there is no
`app/layout.tsx`). `app/layout.tsx` is deleted; `app/fonts.ts` holds the font so
the two trees cannot drift.

**Verified in build output**, not just by inspection: `.next/server/app/uz.html`
has `<html lang="uz">`, `ru.html` has `<html lang="ru">`, and both pages are
still `●` (SSG) in the build manifest — the static rendering was preserved.


**Where:** `app/layout.tsx:22`.

**Problem.** `<html className={...}>` with no `lang`. Confirmed live:
`document.documentElement.lang` is `""`. WCAG 3.1.1 (Level A) failure on a product
whose premise is being bilingual, plus a lost SEO signal.

**Fix is not obvious.** The root layout cannot read `[lang]` params from a child
segment. Standard pattern: have `proxy.ts` set an `x-locale` request header, then read
it with `headers()` in the root layout and set `<html lang={locale}>`.

**Verify:** `document.documentElement.lang` is `uz` on `/uz` and `ru` on `/ru`.

## Q2 (MED) — No `og:image` while `twitter:card` promises one — ✅ FIXED 2026-08-03

**Fixed with a real 1200×630 card**, not the 512px icon. `next/og` ships with
Next, so `app/[lang]/opengraph-image.tsx` generates one at build time with zero
new dependencies.

**The card is wordmark-only on purpose.** `ImageResponse` renders with its own
bundled font, not Plus Jakarta Sans, and that font is not guaranteed to carry
Cyrillic or the Uzbek `ʻ` (U+02BB). A card with tofu boxes in Russian would be
worse than the bare text card it replaces. Brand name and domain render
identically in both locales. To add localised copy, bundle a font file with the
right subsets and pass it in `fonts`.

**Verified in build output:** `og:image`, `og:image:width` 1200,
`og:image:height` 630, `og:image:alt` and `twitter:image` all present in
`.next/server/app/uz.html`.


**Where:** `generateMetadata` in `app/[lang]/page.tsx` (and the other public pages).

**Problem.** The page declares `twitter:card = summary_large_image` and ships no image,
so every share on Telegram, WhatsApp, or an Instagram bio link renders as a bare text
card. For a product whose growth motion *is* Instagram and Telegram, that is a
conversion cost on every link anyone posts.

**Fix.** Add an `openGraph.images` entry. `public/replie-icon-512.png` exists and
works; a purpose-built 1200×630 card is better. Add it for both locales.

**Verify:** `curl -s https://www.replie.uz/uz | grep og:image` returns a tag, and the
URL it points at returns 200.

## Q3 (MED) — No `canonical`, no `hreflang` — ✅ FIXED 2026-08-03

**Fixed** via `localeAlternates()` in `lib/site.ts`, applied to the landing,
pricing, privacy, terms and data-deletion pages. The three legal pages were
converted from a static `metadata` export to `generateMetadata` so they can read
`lang`. The sitemap carries the same alternates as `xhtml:link` elements.

**Verified in build output:** `uz.html` has `canonical → /uz` plus both
hreflangs; `ru.html` has `canonical → /ru` plus both.


**Where:** `generateMetadata` in the public pages.

**Problem.** Two locales with nothing linking them, so `/uz` and `/ru` compete as
duplicates rather than being understood as locale variants.

**Fix.** Next.js supports both via the `alternates` key:

```ts
alternates: {
  canonical: `/${lang}`,
  languages: { uz: "/uz", ru: "/ru" },
}
```

Note `metadataBase` in `app/layout.tsx:13` resolves relative URLs — see Q4, its host
is currently wrong.

## P3 (MED) — Russian users see Uzbek in the dashboard

**Where:** `app/[lang]/(dashboard)/` — settings, logs, inbox, overview, automations,
campaigns, diagnostics.

**Problem.** These pages are hardcoded Uzbek and do not call `useDict()`, so
`/ru/settings` renders Uzbek. Pre-existing rather than a regression (the
pre-consolidation shims re-exported the same Uzbek implementation), but half the
addressable market gets a half-translated product.

**Fix.** Follow the existing i18n pattern: add keys to `lib/i18n/types.ts`, then values
to **both** `lib/i18n/uz.ts` and `lib/i18n/ru.ts`, then use `dict.*` in the component.
`app/[lang]/(dashboard)/dashboard/page.tsx` and `campaigns/page.tsx` are already
translated — copy their approach.

This is the largest mechanical task in this brief. It is safe to do incrementally, one
page per commit.

## P4 (MED) — No plan lifecycle

**Problem.** Nothing expires a plan, handles a failed renewal, or downgrades a
workspace. Once P1 exists, every upgrade is permanent.

**Fix.** Depends on P1's shape. If you add `planExpiresAt`, a daily cron can downgrade
expired workspaces — fold it into the C1 cron rather than adding a third.

---

# TIER 3 — cleanup

## S4 (LOW) — `/api/health` auth is conditional — ✅ FIXED 2026-08-03

**Fixed** in `c346cbf` via the same `requireCronAuth` helper. Its 401 body changed
from `{ status: "unauthorized" }` to `{ success: false, error: "Unauthorized" }`
for consistency with the cron routes; the endpoint is consumed by status code.


**Where:** `app/api/health/route.ts:60`.

`if (secret)` — the bearer check only applies when `CRON_SECRET` is set. If it ever
goes missing the endpoint becomes public and returns raw DB/Redis error strings (the
`EMAXCONNSESSION` error seen on 2026-08-02 includes pool internals).

**Fix.** Require the secret unconditionally; fail closed. Same shape as S1, and the
shared `requireCronAuth` helper covers both.

## S5 (LOW) — `postUrl` unvalidated on the CSV import path — ✅ FIXED 2026-08-03

**Fixed** by the S3 validator, as predicted. Two things found while doing it:

- `trackedUrl` on that route was **already** scheme-checked by a
  `/^https?:\/\//i` regex, so the import path was never an open-redirect vector.
  Only `postUrl` was unguarded. The regex is now the shared `isHttpUrl` instead.
- **The bulk import endpoint has no caller in the app.** The CSV page stages rows
  in `localStorage` and the campaign builder creates them one at a time through
  `POST /api/automations`. The endpoint is still reachable directly by any Pro
  user, so it still needed the fix — but nothing in the UI exercises it, which is
  worth knowing before anyone tries to test this through the interface.

Both URL fields there accept `""` and normalise to null, so a blank CSV cell does
not fail a 200-row import.


**Where:** `app/api/automations/import/route.ts:15` uses `z.string()`, while
`app/api/automations/route.ts:25` uses `z.string().url()`.

Closed by the S3 fix if you apply the shared validator to both routes.

## Q4 (LOW) — Sitemap host does not match the canonical host — ⚠️ NEEDS AN OPERATOR ACTION

**Code side done; the actual fix is not a code change.** `lib/site.ts` is now the
single source for the host used by `metadataBase`, the sitemap and robots.txt, so
they can no longer disagree with each other. But which host is *correct* depends
on what the deployment serves, and that is a Vercel setting.

**Two options, and a recommendation.** Currently `www.replie.uz` is the primary
domain, so the apex 308s to it:

- **Recommended — make the apex `replie.uz` primary in Vercel.** `APP_URL` is
  already the apex, so nothing in the repo changes, and tracked links in DMs stop
  paying a redirect hop. Shorter links in a DM is also just better.
- Or set `APP_URL` to `https://www.replie.uz`. This changes newly generated
  tracked links; existing ones keep working via the 308.

Do **not** leave it as-is: every sitemap URL currently costs crawlers two hops
(308 to www, then 307 to the locale prefix). The second hop is now gone — sitemap
entries are locale-prefixed (Q5) — so fixing the host removes the last one.

`APP_URL` also builds tracked links inside sent DMs (`lib/tracking/message.ts`),
so this value is load-bearing in two places at once.


**Where:** `app/sitemap.ts`, `app/robots.ts`.

`https://replie.uz/pricing` → **308** → `https://www.replie.uz/pricing` → **307** →
`/uz/pricing`. Two redirect hops for every URL advertised to crawlers, because both
files build from `APP_URL` (the apex) while the deployment canonicalises to `www`.

**Fix.** Either set `APP_URL` to the `www` host or serve the apex directly.

**Careful:** `APP_URL` also builds tracked links inside sent DMs
(`lib/tracking/message.ts:65`). Changing it changes newly generated links. Existing
links keep working via the 308, so this is safe, but know that you are touching two
things at once.

## Q5 (LOW) — Sitemap omits the Russian locale — ✅ FIXED 2026-08-03

**Fixed.** 10 URLs now (5 public paths × 2 locales), each locale-prefixed so it
resolves directly instead of through a redirect, each carrying hreflang
alternates. Paths: `/`, `/pricing`, `/privacy`, `/terms`, `/data-deletion`.


**Where:** `app/sitemap.ts` lists only `/` and `/pricing`.

**Fix.** Emit `/uz`, `/ru`, `/uz/pricing`, `/ru/pricing`, and any other public page
worth indexing (`privacy`, `terms`, `data-deletion`).

## Q6 (LOW) — `robots.txt` `Disallow: /dashboard/` never fires — ✅ FIXED 2026-08-03

**Fixed, and the duplication that caused it is gone.** Rather than hand-writing
`/*/dashboard`, the protected-path list moved to `PROTECTED_PATHS` in
`lib/site.ts` and is now shared by `proxy.ts` (which enforces the auth redirect)
and `app/robots.ts` (which maps each entry to `/*<path>`). Adding a protected
page can no longer leave it advertised to crawlers.

All nine protected paths are covered, where before only `/dashboard/` was listed
and it matched nothing. `/reports/` is added too — share links are handed to
specific clients and the reports layout also sets `robots: { index: false }`.


**Where:** `app/robots.ts`.

Real dashboard paths are `/uz/dashboard` and `/ru/dashboard`, so the rule matches
nothing. Low impact because the dashboard requires auth, but it is not doing the job
it appears to. `/api/` and `/r/` are correct — those are not locale-prefixed.

**Fix.** Use `/*/dashboard` or list both locale paths.

## C4 (LOW) — Single points of failure

One `e2-micro` running the worker under `--restart always` — survives a reboot, not a
VM failure or a Docker daemon problem. Redis is a free tier whose eviction policy can
drop queued jobs.

**Related and already tracked:** the Redis eviction policy is `volatile-lru` and should
be `noeviction`; under memory pressure Redis Cloud can evict queued jobs and silently
lose DMs. Change it in the Redis Cloud console. This is blocker 1 in HANDOFF.md.

Not a code fix. Worth naming so it is a decision rather than an accident.

---

## Do NOT "fix" these

Time was spent proving each of these is fine. Re-reporting them is a regression in
itself.

### Investigated and discarded

- **XSS via `postUrl` in the public report page.** A user-controlled value reaches
  `href` at `app/reports/[shareSlug]/page.tsx:300` on an unauthenticated page. Tested
  against React 19.2.4: it rewrites `javascript:` hrefs to
  `throw new Error('React has blocked a javascript: URL as a security precaution.')`.
  Not exploitable. **Re-test only if React is ever downgraded.**
- **IDOR on `/api/instagram/conversations/[id]`.** `conversationId` is taken unvalidated
  from the URL, but the request uses the caller's own Instagram token, so Meta refuses
  another workspace's conversation. Relies on Meta's enforcement rather than a local
  check — defensible.
- **Rate limiting / DoS** and **timing analysis of bearer comparisons** — out of scope
  for this pass, not concretely exploitable.

### Verified correct — leave alone

- **Send deduplication** — a unique constraint on `(automationId, commentId)`, not
  application logic. A duplicated webhook physically cannot double-send.
- **Quota reservation** — `reserveWorkspaceDMSend` does the period reset and the
  reservation inside one `prisma.$transaction`. Concurrent sends cannot overshoot.
- **Rate limiting** — `reserveDMSlot` distinguishes requeue from skip and carries a
  backoff delay rather than dropping jobs.
- **Token encryption** — AES-256-GCM, random IV per token, auth tag verified on decrypt.
- **Webhook signatures** — HMAC-SHA256 via `timingSafeEqual`, wrapped so the
  length-mismatch throw cannot bypass verification. It accepts either the Facebook or
  Instagram app secret on purpose.
- **RLS** — enabled on all 15 tables. Prisma connects as superuser, so this is
  defense-in-depth against a leaked anon key. Correct posture.
- **Workspace membership** — `canManageWorkspace` on every mutation, `OWNER` protected
  from demotion and deletion, self-deletion blocked, invitations check expiry *and*
  that the session email matches.
- **Report share slugs** — `randomBytes(9)`, 72 bits. Unguessable.
- **The three `.catch(() => {})`** in `lib/polling/comment-reconciler.ts:266`,
  `lib/queue/dm-worker.ts:288`, `app/api/webhook/route.ts:52` — each deliberate and
  commented.
- **`components/campaign-preview.tsx`** intentionally uses dark zinc and `rounded-2xl`
  to mimic the Instagram UI, against the design system. Documented exception.
- **304 lint warnings** are pre-existing. The bar is **0 errors**, not 0 warnings.

---

## Suggested order

1. ~~**S1**~~ — done 2026-08-03.
2. ~~**C1 + C3 + S4**~~ — done 2026-08-03. Landed as three commits, not one: the
   auth helper and the alerting cron are independently revertable.
3. ~~**S3 + S5**~~ — done 2026-08-03.
4. ~~**S2**~~ — done 2026-08-03.
5. **P1** — decided (admin endpoint, D2 in DECISIONS.md); build the granting logic as a
   reusable function so the payment webhook can call it later. ← **next**.
   The admin gate it needs already exists: `isCurrentUserPlatformAdmin()`, D3.
6. ~~**Q1–Q6**~~ — done 2026-08-03, except Q4's operator action.
7. **P3** — dashboard translation, incremental, one page per commit.
8. **P2, P4** — after P1 lands.

Findings are independent unless noted. The only hard dependencies are
P2 → P1 and P4 → P1.
