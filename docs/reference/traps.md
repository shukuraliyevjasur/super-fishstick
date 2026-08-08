# Traps

Things that will cost you hours if you find them the hard way. Every one of these was
paid for once already. Read before touching the area it names.

Consolidated from HANDOFF.md and FIX_BRIEF.md, which each carried a partial copy, plus
the findings from the 2026-08-07 review pass.

---

## Never run `npm install` on Windows

It silently breaks CI. It floats hoisted `@emnapi/core` / `@emnapi/runtime` off 1.10.0,
which `@rolldown/binding-wasm32-wasi` pins exactly. The result installs fine locally and
fails `npm ci` on Linux.

**Before committing, always run `git diff package-lock.json`.** If you did not intend a
dependency change, discard it:

```bash
git checkout HEAD -- package-lock.json
```

If the lockfile genuinely must change, generate it on Linux — WSL, the GCP VM, or CI.
This is how `@sentry/nextjs` was added.

> If `npm run typecheck` reports `TS2307: Cannot find module '@sentry/nextjs'`, your
> `node_modules` is behind the lockfile. Run **`npm ci`** — it installs strictly from
> `package-lock.json` and never writes it, so it is safe on Windows. `npm install` is the
> one that breaks CI.

### The corollary nobody expects: batch your dependency additions

Two branches that each add a dependency produce **two individually valid lockfiles**. Each
passes its own CI. They break `npm ci` when merged, and the breakage surfaces at the merge
rather than in either branch.

The Telegram work has exactly this shape: grammY and the component-test libraries
(`@testing-library/react` + `happy-dom`) are separate tasks in separate slices, and both
need the Linux lockfile pass. **They must land together.** See
[../START-HERE.md](../START-HERE.md).

---

## Prisma 7 keeps the datasource URL in `prisma.config.ts`, not `schema.prisma`

Adding `url = env("DATABASE_URL")` to the schema's datasource block breaks the build with
P1012.

Local commands need a dummy URL:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
```

**Never apply a migration by hand in the Supabase SQL editor** without also inserting its
row into `_prisma_migrations`. Otherwise the next deploy re-applies it, fails, records a
*failed* migration, and blocks every later deploy with P3009.

Pushing to `main` runs `prisma migrate deploy` against the live database. Know what is in
`prisma/migrations/` before you push.

---

## The middleware matcher is load-bearing

`proxy.ts` prefixes every unprefixed path with a locale. Anything with no page under
`app/[lang]/` **must** stay excluded from `config.matcher` or it redirects into a 404.

Currently excluded: `/api/*`, `/r/*`, `/reports/*`, `robots.txt`, `sitemap.xml`.

`/r/*` matters most — `lib/tracking/message.ts` bakes `${APP_URL}/r/<slug>` into every DM
already sent, so those URLs cannot change retroactively. This regressed once and every
tracked-link click 404'd with no clicks recorded.

`__tests__/proxy-matcher.test.ts` guards it. **Do not weaken that test.** Any new
locale-less route (e.g. a Telegram Mini App) must be added to both.

---

## `t()` must be imported from `lib/i18n/t.ts` in server components

`components/dictionary-provider.tsx` is a `"use client"` module. Anything exported from it
— including a pure helper — becomes a client reference, and calling it from a server
component throws at render time. This already shipped once and 500'd
`/[lang]/login?template=<slug>`.

- Server component: `import { t } from "@/lib/i18n/t"`
- Client component: either import works

---

## Instagram code 100 means the account is not linked to the app

If any `graph.instagram.com` call returns
`code 100 — Unsupported request - method type: get`, the request is almost certainly fine
and the **Instagram account is not attached to the Meta app**. Add it under Meta dashboard
→ Use cases → Instagram API setup → Generate access tokens → Add account.

A *fake* token returns 190 instead, so curl probes report the endpoint as healthy and
cannot reproduce it. **This cost six deploys and two wrong fixes.** Do not start permuting
URLs or HTTP methods.

---

## Messaging webhooks need the *interacting user* to hold an app role

Instagram messaging webhooks (`messages`, `messaging_postbacks`, `messaging_seen`) are
silently dropped under Standard Access when **the person interacting** — the follower who
comments, taps, or DMs — has no role on the app. You cannot identify or enrol them in
advance, so this is not a configuration problem and cannot be worked around.

`comments` webhooks are unaffected and fire for anyone. That asymmetry is why the whole
product runs on the comment surface.

**The Facebook Page finding is a confound.** HANDOFF previously credited FB Page linkage
for `messaging_postbacks` starting to deliver for `foundersyrio` on 2026-08-04. That
account was *also* an Instagram tester, which is the actual explanation. Do not plan around
Page linkage and do not add it to onboarding.

Independently confirmed: an n8n community thread (Aug 2025) reports the identical
behaviour — webhooks fire only when the sender is a designated tester.

**The way around it** for button taps is `lib/meta/reveal-token.ts` +
`app/api/reveal/[token]/route.ts`: a `web_url` button instead of a postback. The follower's
browser hits the endpoint, which enqueues the same job. No webhook, so the role constraint
never applies. `sendPrivateReplyWithLinkButton` already uses `web_url` buttons in
production, which proves the mechanism works under Standard Access.

---

## The Meta tester cap is 50

An app **not** linked to a verified Business is capped at **50 testers**; linked and
verified gets 500. Since every customer's Instagram account must be added as a tester under
Standard Access, 50 is the ceiling on accounts the product can serve.

Treated as temporary pilot capacity, not a design constraint — see
[decisions](../product/decisions.md). But do not build a sales pipeline against a larger
number without checking this first.

---

## Sessions are JWT, and that is forced

`@auth/core`'s credentials branch always encodes a JWT cookie and never writes a `Session`
row, ignoring the configured strategy. Under `strategy: "database"` a password sign-in
mints a cookie the session lookup cannot resolve.

So `lib/auth.ts` uses `strategy: "jwt"`, the session callback reads `token.sub` (not
`user.id`), and the `Session` table is vestigial. **Do not switch the strategy back**
without also removing the Credentials provider.

Accepted tradeoff: sessions cannot be revoked server-side.

---

## `ENCRYPTION_KEY` must be byte-for-byte identical on Vercel and the worker

It encrypts stored Instagram OAuth tokens: the web app writes them, the worker decrypts
them to send. A mismatch means every DM fails to decrypt. Rotating it invalidates every
stored token and all connected accounts must reconnect.

---

## ~~`getRedisConnection()` applies its options only on the first call~~ Fixed (E1)

`lib/queue/client.ts` now has two named singletons: `getRedisConnection()` (fail-fast, web)
and `getWorkerConnection()` (persistent, `maxRetriesPerRequest: null`). The worker uses
`getWorkerConnection()`; everything else uses `getRedisConnection()`. No import-ordering
hazard remains.

---

## Failed-job counts self-erase every 5 minutes

`lib/queue/client.ts` sets `removeOnFail: { age: 300, count: 2000 }`. Any health alert
based on `getJobCounts().failed` reads a counter that is empty most of the time. It appears
to work only because cron-job.org polls `/api/cron/health-check` every 60 seconds.

Use `getWorkerAlerts()` (`lib/ops/worker-health.ts`) instead — durable, written on every
failure, and it had no consumer until this was noticed.

---

## ~~There is no React component test capability~~ Fixed (E7)

Component tests now work: vitest matches `.tsx`, `@testing-library/react` + `happy-dom` are
installed, and 8 pin tests cover the campaign builder save payload. 27 test files total.

Any plan that refactors a component needs that infrastructure added first, **and that
lockfile must be generated on Linux** (see the first trap).~~
