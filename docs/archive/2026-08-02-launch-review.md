> **ARCHIVED — not current.** Superseded by [../product/roadmap.md](../product/roadmap.md)
> and [../product/decisions.md](../product/decisions.md). If this file disagrees with those,
> they win. Context: [README.md](README.md). Kept for the reasoning, not the conclusions.

# Launch review — 2026-08-02

Pre-launch review of replie, run in phases. Findings only; nothing here is fixed yet.
Delete an item when it lands and note the commit.

Security findings live separately in [SECURITY_AUDIT.md](2026-08-02-security-audit.md).

- [Phase 1 — Security](2026-08-02-security-audit.md) — 5 findings, 1 HIGH
- [Phase 2 — Live QA](#phase-2--live-qa) — 6 findings
- [Phase 3 — Code gaps](#phase-3--code-gaps) — 4 findings, 1 HIGH
- [Phase 4 — Product gaps for launch](#phase-4--product-gaps-for-launch) — 4 findings, 2 HIGH

**19 findings total, 4 HIGH.** In rough order of what would hurt most:

1. **P1** — a paid plan cannot be granted through the product (blocks revenue entirely)
2. **C1** — worker death is silent (customers churn before you find out)
3. **S1** — cron auth falls back to the JWT signing key (one env change from session forgery)
4. **P2** — no payment integration

Everything else is real but survivable at launch scale.

---

## Phase 2 — Live QA

Run against production (`www.replie.uz`), desktop and mobile.

### Verified working

Recorded so it is not re-tested: `/r/<slug>` reaches the tracked-link handler and
redirects (the middleware fix is live against real traffic), `robots.txt` and
`sitemap.xml` serve 200, `/uz/dashboard` bounces to `/uz/login`, signup and login
render correctly in both locales, zero console errors, and no horizontal overflow
at 375px.

### Findings

| # | Sev | Finding | File |
|---|-----|---------|------|
| Q1 | MED | `<html>` has no `lang` attribute — WCAG 3.1.1 Level A | `app/layout.tsx:22` |
| Q2 | MED | No `og:image`, but `twitter:card` promises `summary_large_image` | `app/[lang]/page.tsx` metadata |
| Q3 | MED | No `canonical`, no `hreflang` on a bilingual site | `app/[lang]/page.tsx` metadata |
| Q4 | LOW | Sitemap advertises the apex; the site canonicalises to `www` | `app/sitemap.ts`, `app/robots.ts` |
| Q5 | LOW | Sitemap omits the Russian locale entirely | `app/sitemap.ts` |
| Q6 | LOW | `robots.txt` `Disallow: /dashboard/` matches no real path | `app/robots.ts` |

### Q1 — No `lang` attribute on `<html>`

`app/layout.tsx:22` renders `<html className={...}>` with no `lang`. Confirmed live:
`document.documentElement.lang` is `""`.

Level A accessibility failure on a product whose whole premise is being bilingual —
screen readers cannot choose pronunciation, and Google loses the language signal.

**Fix is not obvious.** The root layout cannot read `[lang]` params from a child
segment. The standard pattern is to have `proxy.ts` set an `x-locale` request header
and read it with `headers()` in the root layout.

### Q2 — No `og:image`

The page declares `twitter:card = summary_large_image` but ships no image, so every
share on Telegram, WhatsApp, or an Instagram bio link renders as a bare text card.
For a product whose growth motion is Instagram and Telegram, that is a conversion
cost on every link anyone posts.

`public/replie-icon-512.png` exists and would work; a purpose-built 1200×630 card
would be better.

### Q3 — No canonical or hreflang

Two locales with nothing linking them, so `/uz` and `/ru` compete as duplicates
rather than being understood as locale variants. Next.js supports both through the
`alternates` key in `generateMetadata`.

### Q4 — Sitemap host does not match the canonical host

`https://replie.uz/pricing` → **308** → `https://www.replie.uz/pricing` → **307** →
`/uz/pricing`. Two redirect hops for every URL advertised to crawlers. `app/sitemap.ts`
and `app/robots.ts` build from `APP_URL`, which is the apex, while the deployment
canonicalises to `www`.

Either set `APP_URL` to the `www` host or serve the apex directly. Note `APP_URL`
also builds tracked links inside sent DMs, so changing it affects links going out —
existing links keep working via the 308.

### Q5 — Russian is missing from the sitemap

`app/sitemap.ts` lists only `/` and `/pricing`. `/ru` and `/ru/pricing` are absent,
so half the target market has no sitemap coverage.

### Q6 — `Disallow: /dashboard/` never fires

Real dashboard paths are `/uz/dashboard` and `/ru/dashboard`, so the rule as written
matches nothing. Low impact because the dashboard requires auth, but it is not doing
the job it appears to. `/api/` and `/r/` are correct — those are not locale-prefixed.

---

## Phase 3 — Code gaps

### Verified solid

Worth recording, because these are the parts most likely to be wrong in a product
like this and they are not:

- **Send deduplication** — enforced by a unique constraint on
  `(automationId, commentId)`, not by application-level checks, so a double-delivered
  webhook cannot produce a double DM.
- **Quota reservation is transactional** — `reserveWorkspaceDMSend` does the period
  reset and the reservation inside one `prisma.$transaction`, so concurrent sends
  cannot overshoot a plan's monthly cap.
- **Rate limiting** — `reserveDMSlot` distinguishes requeue from skip and carries a
  backoff delay, rather than dropping the job.
- **Error swallowing** — only three `.catch(() => {})` in the whole codebase, each
  deliberate and commented.

### Findings

| # | Sev | Finding | File |
|---|-----|---------|------|
| C1 | **HIGH** | Nothing alerts when the worker dies — DMs stop silently | `lib/ops/worker-health.ts`, `app/api/health/route.ts` |
| C2 | MED | No error tracking; debugging means grepping Vercel logs by hand | `package.json` |
| C3 | MED | Token-refresh cron failures are recorded but never surfaced | `app/api/cron/refresh-tokens/route.ts` |
| C4 | LOW | Single worker instance and free-tier Redis, no redundancy | infra |

### C1 — Worker death is silent

`/api/health` exists and reports database, Redis, queue and worker heartbeat — and
**nothing calls it.** No cron pings it, no external monitor, no alert. The only two
Vercel crons are `refresh-tokens` and `attach-next-reel`.

`recordWorkerAlert()` writes to Redis, and the sole consumer is
`/api/admin/diagnostics` — a page a human has to remember to open.

**Failure mode.** The worker stops (VM reboot without Docker restart, OOM, crash
loop). Jobs pile up in Redis. Every customer's comment-to-DM silently stops working.
Nobody finds out until a customer complains, and the first symptom is churn rather
than an alert. For a paid product this is the single biggest operational gap.

**Cheapest fix.** A Vercel cron that hits `/api/health` on a schedule and sends an
email through Resend when it returns 503. The endpoint already returns the right
status code — the plumbing exists, nothing consumes it.

### C2 — No error tracking

The only observability dependency is `@vercel/analytics`, which is page views. There
is no Sentry-equivalent, so a production exception is only visible by grepping Vercel
logs.

This has a concrete cost already: diagnosing the Instagram linking failure on
2026-08-02 took six deploys, and much of that was reading log lines by hand and
adding temporary instrumentation to see request details that a tracker would have
captured on the first occurrence.

### C3 — Token refresh fails silently

The cron writes an `OperationalEvent` with `source: TOKEN_REFRESH, level: ERROR` on
failure, which is only readable through the diagnostics page. Combined with C1 there
is no notification.

This is not hypothetical: `refreshLongLivedToken` was calling a versioned URL that
Meta rejects (fixed 2026-08-02), so the cron was failing and nothing said so. The
first visible symptom would have been every connected account dropping at the 60-day
mark, months later, with no obvious cause.

### C4 — Single points of failure

One `e2-micro` running the worker under `--restart always` — which survives a reboot
but not a VM failure or a Docker daemon problem. Redis is a free tier whose eviction
policy can drop queued jobs (already tracked as blocker 1 in HANDOFF.md). Acceptable
for early stage; worth naming so it is a decision rather than an accident.

---

## Phase 4 — Product gaps for launch

| # | Sev | Finding |
|---|-----|---------|
| P1 | **HIGH** | No code path assigns a paid plan — upgrades require editing the database |
| P2 | **HIGH** | No payment integration; pricing sends people to Telegram |
| P3 | MED | Dashboard pages are hardcoded Uzbek, so `/ru/*` shows Uzbek |
| P4 | MED | Nothing handles downgrade, non-payment, or plan expiry |

### P1 — A paid plan cannot be granted through the product

`workspace.plan` defaults to `FREE` and **no route, job, or admin screen ever writes
it.** Verified by searching every write to that field across `app/`, `lib/`, and
`worker/`: there are none.

So the complete upgrade path today is: customer pays somehow, then someone opens
Supabase and runs an `UPDATE`. That works for the first handful of customers and
breaks immediately after — there is no audit trail of who upgraded whom, no way to
downgrade on non-payment, and no expiry.

The plan gates are real and enforced (`canUseFeature` blocks tracked links, opening
DMs, CSV import), so this is the one thing standing between the billing model and
actually charging anyone.

### P2 — No payment integration

Every pricing CTA links to `t.me/ceo_syr`. For the Uzbek market the expected rails
are Payme, Click, or Uzum — none are integrated. Manual invoicing is a reasonable
place to start, but it needs P1 solved to be operable at all.

### P3 — Russian users see Uzbek

The dashboard pages under `app/[lang]/(dashboard)/` are hardcoded Uzbek and do not
call `useDict()`, so `/ru/settings` renders Uzbek. Pre-existing rather than a
regression (the pre-consolidation shims re-exported the same Uzbek implementation),
but half the addressable market gets a half-translated product.

### P4 — No lifecycle around plans

Nothing expires a plan, handles a failed renewal, or downgrades a workspace. Once P1
exists this becomes the immediate follow-on, otherwise every upgrade is permanent.
