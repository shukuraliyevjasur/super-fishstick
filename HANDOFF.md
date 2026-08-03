# replie — Agent Handoff

**Last updated:** 2026-08-03

## What this is

**replie** is a paid SaaS for the Uzbek market, built on an OpenReply fork.
It automates Instagram comment-to-DM campaigns (keyword triggers, follow gates,
tracked links).

**Status: deployed and running.** Web app is live on Vercel, worker is live on a
GCP VM, database is migrated. Not yet open to real users — see
[Before real users](#before-real-users).

---

## Live infrastructure

| Layer | Where | Detail |
|-------|-------|--------|
| Web app | Vercel | `replie.uz` (custom domain) + `super-fishstick-gamma.vercel.app`, repo `shukuraliyevjasur/super-fishstick`, auto-deploys on push to `main` |
| Database | Supabase Postgres | Session-mode pooler, port 5432 (IPv4-compatible; the direct connection is IPv6-only and fails from Vercel) |
| Queue / cache | Redis Cloud | Essentials free tier, native TCP |
| Worker | GCP Compute Engine | VM `replie`, zone `us-central1-a`, e2-micro, Debian 13, 30 GB standard disk — Always Free tier |
| Email | Resend | Magic-link auth via `login@replie.uz`. Domain verified 2026-08-01. |
| Domain | Namecheap (or registrar) | `replie.uz` — A record → Vercel IP, CNAME www → Vercel. DNS also has Resend records (DKIM, SPF, DMARC on `send` subdomain). |

**Cost: $0/month.** The GCP e2-micro is in the Always Free tier (`us-central1`,
standard persistent disk — a balanced/SSD disk would bill). Fly.io was the
original plan but dropped its free allowance to a 7-day trial; `fly.toml` was
removed in the same commit as this file.

### Why the worker needs its own host

`worker/dm-worker.ts` is a long-running process: it consumes the BullMQ send
queue, runs a heartbeat every 30s, and runs the comment-reconciliation poller
every 5 minutes. Vercel cannot host it — its free crons only fire once a day, and
functions do not stay resident. If the worker is down, **jobs queue in Redis and
no DMs are sent.**

---

## Deploying

### Web app

Push to `main`. Vercel builds with `prisma generate && prisma migrate deploy && next build`.

### Worker

The e2-micro is too small to build the image itself — `npm ci` took over 40
minutes and ran out of memory before swap was added. **Build on GitHub Actions,
pull on the VM.**

1. `.github/workflows/worker-image.yml` builds and pushes
   `ghcr.io/shukuraliyevjasur/replie-worker:latest`. It triggers on pushes that
   touch `worker/`, `lib/`, `prisma/`, `Dockerfile`, or `package*.json`, and can
   be run manually via **Actions → Build & Push Worker Image → Run workflow**.
   The GHCR package must stay **public** for the VM to pull without auth.

2. On the VM (GCP Console → Compute Engine → `replie` → SSH):

```bash
docker pull ghcr.io/shukuraliyevjasur/replie-worker:latest
docker stop replie-worker && docker rm replie-worker
docker run -d --name replie-worker --restart always \
  -e NODE_ENV=production \
  -e DATABASE_URL="..." -e REDIS_URL="..." \
  -e ENCRYPTION_KEY="..." -e APP_URL="..." \
  ghcr.io/shukuraliyevjasur/replie-worker:latest
```

3. Confirm: `docker logs replie-worker` → `[DM Worker] Started`.

`--restart always` means it survives VM reboots.

**Recovering the env values for step 2.** They are not in this repo. Read them
off the container that is already running, *before* you remove it:

```bash
docker inspect replie-worker --format '{{range .Config.Env}}{{println .}}{{end}}'
```

Copy that output somewhere before `docker rm`, or you will have to re-derive
each value from the Vercel env settings (Project → Settings → Environment
Variables).

> **The running container is older than the image on GHCR.** As of 2026-08-01 it
> still runs the Node 20 base; the current image is Node 24. Same application
> code — only the base image differs — so this is not urgent, but the VM has not
> pulled since. The steps above bring it current.

---

## Environment variables

Values live in Vercel's env settings and in the worker's `docker run` — never in
the repo.

**Web app (Vercel):** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`,
`ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `EMAIL_FROM`,
`META_GRAPH_API_VERSION`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`,
`FACEBOOK_APP_SECRET`, `WEBHOOK_VERIFY_TOKEN`, `APP_URL`.

**Worker (GCP):** `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `APP_URL`, `NODE_ENV`.

Optional: `DATABASE_POOL_MAX` overrides the per-instance connection cap
(default 1 — see [Database connections](#database-connections)).

> `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` are the **Instagram-specific**
> credentials from **Use cases → Instagram API setup** in the Meta dashboard, not
> the top-level App ID and secret under App Settings → Basic. They are different
> values, and the top-level pair does not work for Instagram Business Login.

> **`ENCRYPTION_KEY` must be byte-for-byte identical on Vercel and the worker.**
> It encrypts stored Instagram OAuth tokens: the web app writes them, the worker
> decrypts them to send. A mismatch means every DM fails to decrypt. It was
> rotated on 2026-07-31, which invalidated any previously stored tokens —
> connected accounts must reconnect. Generate with `openssl rand -hex 32`.

`APP_URL` is `https://replie.uz`. It builds tracked links inside sent DMs and
must be set on both Vercel and the worker docker run.

---

## Auth — password sign-in, magic link as fallback

Added 2026-08-02. Before this, every sign-in required an email round-trip.

| Screen | Path | What it does |
|--------|------|--------------|
| Sign up | `app/[lang]/signup/page.tsx` | Email + password in one form. Creates the user, provisions the workspace, sends a confirmation email best-effort, signs in, lands on the dashboard. |
| Sign in | `app/[lang]/login/page.tsx` | Email + password, with `?mode=link` for the magic link. |
| Set password | `app/[lang]/set-password/page.tsx` | For accounts with no password yet. |

All signup-intent CTAs (hero, final CTA, pricing free plan) point at `/signup`.
They previously pointed at `/login`, which showed new users a password form for
an account they did not have.

### Sessions are JWT — this is forced, not a preference

`@auth/core`'s credentials branch always calls `jwt.encode` and **never writes a
`Session` row**, and it does not check the configured strategy. Under
`strategy: "database"` a password sign-in mints a cookie the session lookup
cannot resolve. So `lib/auth.ts` uses `strategy: "jwt"`.

Consequences:

- The session callback reads `token.sub`, not `user.id`. Reverting that breaks
  `session.user.id`, and with it every `getCurrentWorkspaceId()` call.
- **Sessions are not revocable server-side.** Logout clears the cookie; a stolen
  token stays valid until expiry. Worth addressing before real traffic.
- The `Session` table is vestigial. Cookie names are unchanged, so `proxy.ts` is
  unaffected.

### Password hashing uses Node's built-in scrypt

`lib/auth/password.ts`. Deliberately not bcrypt or argon2 — both are native
modules, and installing one regenerates `package-lock.json`, which
[breaks CI when done from Windows](#dependencies--do-not-commit-a-windows-regenerated-lockfile).
scrypt ships with Node and adds no dependency.

Hashes are self-describing (`scrypt$N$r$p$salt$hash`), so cost parameters can be
raised later without invalidating existing passwords.

### Rules that are not obvious

- **An email that already exists never gets a password set through signup** —
  including a legacy magic-link account that has none. Allowing it would let
  anyone claim someone else's account by "signing up" as them. Those users are
  sent to sign in, where the magic link still works as recovery.
- Accounts without a password are routed to `/set-password` by the dashboard
  layout. That page sits **outside** the `(dashboard)` group so the guard cannot
  loop.
- Confirming the email is not required to use the app; a banner offers a resend.
  The send at signup is wrapped in try/catch so a Resend outage cannot cost
  someone their account.

---

## Database connections

`lib/db/client.ts` passes an explicit `pg.PoolConfig` with **`max: 1`**.

Supabase's session-mode pooler caps the project at 15 clients while node-pg
defaults to 10 per pool, so two warm Vercel instances could exhaust it and the
whole app failed with:

```
(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15
```

Serverless wants 1 — an instance serves one request at a time and holds
connections open while warm. Override with `DATABASE_POOL_MAX` on the worker,
which is a single long-running process, if queue throughput needs it.

> `max: 1` is a **per-instance** cap, not a global one. Enough concurrent Vercel
> instances can still reach 15. The durable fix is Supabase's transaction-mode
> pooler on port 6543, which is built for serverless.

---

## Instagram Graph API — versioned vs unversioned hosts

Instagram splits its endpoints and the distinction is invisible until a real
token is involved:

| Call | URL |
|------|-----|
| OAuth token exchange | `https://graph.instagram.com/access_token` — **no version** |
| OAuth token refresh | `https://graph.instagram.com/refresh_access_token` — **no version** |
| Graph nodes (`/me`, `/media`, …) | `https://graph.instagram.com/v25.0/…` — **versioned** |

Prefixing the token endpoints with a version is wrong, though it was **not** what
broke account linking — see below.

### Code 100 "Unsupported request" means the account is not linked to the app

**This is the one to read first.** If any `graph.instagram.com` call returns:

```
code 100 — Unsupported request - method type: get   (type: IGApiException)
```

the request is almost certainly fine and the **Instagram account is not attached
to the Meta app**. Add it under **Use cases → Instagram API setup with Instagram
login → 2. Generate access tokens → Add account**, sign in as that account, and
retry. (There is no need to press *Generate token*; that only mints a token by
hand for dashboard testing.)

Until that linkage exists Meta will happily run the whole OAuth flow — issue an
authorization code, exchange it for a valid `IGAA` token, report the full granted
scope list — and then refuse **every** Graph call made with that token. The
long-lived exchange and `/me` both fail identically.

Two properties make this very easy to misdiagnose:

- **A fake token returns 190, not 100.** The OAuth layer rejects it before the
  account check runs, so the endpoint looks perfectly healthy to any curl probe.
  Nothing short of a live callback reproduces it.
- **The message names the HTTP verb**, which reads like a method problem. It is
  not — POST returns the same error with `method type: post`. Four URL shapes
  (unversioned/versioned × GET/POST) were tried before this was understood; none
  of them was the issue.

Diagnosing it cost several deploys. The order that would have worked: confirm the
account appears under *Generate access tokens*, then read the step name in the
callback log, then look at the request.

### The code-exchange response is nested (a real, separate bug)

`POST https://api.instagram.com/oauth/access_token` returns the token inside a
`data` array, not at the top level:

```json
{ "data": [ { "access_token": "...", "user_id": 178414, "permissions": "..." } ] }
```

`exchangeCodeForToken` read `payload.access_token`, which is `undefined`. That
undefined was passed into `getLongLivedToken`, where Meta answered:

```
code 100 — Unsupported request - method type: get
```

The error therefore pointed at the **wrong call** — the failure was two steps
upstream. `lib/meta/oauth.ts` now reads `payload.data[0]` (still accepting a flat
response) and **throws immediately** if no token is present, rather than letting
`undefined` travel downstream.

This was a genuine bug and is fixed, but note it was *masked* by the unlinked
account above: both produce a code-100 error from the same call, so fixing the
nesting changed nothing visible until the account was linked.

`getUserInfo` must keep requesting **`user_id`**. It is the professional account
id that webhooks arrive under (`entry.id`); the app-scoped `id` is not
interchangeable, and without it comment events cannot be matched to an account.

`__tests__/meta-endpoints.test.ts` guards both facts. The OAuth callback records
which step failed, so a failure logs `Failed at step "long_lived_token"` rather
than a bare code-100 that could have come from any of three calls.

---

## Messaging webhooks have never fired — open investigation (2026-08-03)

**Symptom:** the opening DM sends and its button renders, but tapping it delivers
nothing. The reveal never arrives.

**The core fact, and the one to start from:** *no Instagram messaging webhook of
any kind has ever reached us.* Not `messaging_postbacks`, not `messaging_seen`,
not `messages`. `comments` events flow fine through the same endpoint, the same
signature check, the same subscription. Verify before doing anything else:

```sql
SELECT "createdAt", entry_change.value ->> 'field' AS field, entry.value ->> 'id' AS entry_id
FROM "WebhookEvent",
     LATERAL jsonb_array_elements(payload -> 'entry') AS entry(value),
     LATERAL jsonb_array_elements(entry.value -> 'changes') AS entry_change(value)
ORDER BY "createdAt" DESC LIMIT 50;
```

Every `messaging_postbacks` row in the table as of 2026-08-03 has
**`entry_id = "0"`**. That is Meta's synthetic fixture from the dashboard's *Send
to server* button (sender `2494432963985342`, payload `"Payload"`, title
`"Talk to human"`, `is_self: true`). Those prove the endpoint parses and stores
correctly. They prove nothing about live delivery. Do not mistake them for real
traffic — that mistake was made twice on 2026-08-03.

A real tap leaves a visible message bubble in the thread, which should itself
fire a `messages` event. None has ever arrived either. Whatever is wrong is
account-wide and affects the entire messaging family, not postbacks specifically.

### Ruled out, with evidence — do not re-investigate

| Hypothesis | How it was killed |
|---|---|
| Parser read the wrong payload shape | Fixed and verified. Instagram Graph API delivers messaging via `entry.changes[].field`, **not** `entry.messaging[]` (that is the old Messenger Platform shape). `lib/meta/webhook.ts` handles `entry.changes` first with `entry.messaging` as fallback; the synthetic events parse and enqueue correctly. |
| Account-level subscription missing `messaging_postbacks` | Was genuinely missing from `subscribed_fields` in `subscribeInstagramAccountToWebhooks`; added, and every account re-subscribed via `POST /api/instagram/resubscribe`. `GET` on the same route now reports `["comments", "messages", "messaging_postbacks"]`. Did not change the symptom. |
| App-level webhook fields not subscribed | Dashboard shows `messages`, `messaging_postbacks`, `messaging_seen` all Subscribed on v26.0. |
| Token missing the OAuth scope | `getAuthorizationUrl` requests `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`, `instagram_business_manage_insights`. All four granted. |
| Expired or invalid token | Comments and sends both work on the same token. |
| **App Review / Advanced Access is the gate** | **Refuted.** Sending a private reply requires `instagram_business_manage_messages` — the exact permission suspected — and `vitreen.uz`, an account with no relationship to the app or the Meta account, received one at 22:14 and 22:19 UTC. The permission works for strangers today. The app is **Published**, not in dev mode. |

### Wrong turns that cost the 2026-08-03 session

- **Reading "Ready for testing" as a blocker.** Every permission on the list
  carries that label, including `instagram_business_basic`, which strangers
  demonstrably reach. The label does not mean what it looks like it means.
- **Treating the phone's message thread as evidence of what the system sent.**
  Two DMs seen in the Instagram UI were reported as postback reveals. There are
  **zero** `DmLog` rows with `commentId LIKE 'reveal:%'` — the system never sent
  a reveal to anyone. Always confirm against `DmLog` / `WebhookEvent` before
  concluding a path works.
- **`debug_token` against `graph.facebook.com`.** Returns code 190 for this app
  and always will: it uses **Instagram Login**, so `INSTAGRAM_APP_ID` is not a
  Facebook app id and Graph API Explorer shows "No configurations available".
  There is no Facebook user token to inspect. Dead end, not a misconfiguration.

### Next test — the Instagram account's inbox access toggle

Untried as of this writing, and the best remaining hypothesis. Instagram has an
**account-level** setting controlling whether third-party apps receive messaging
webhooks. It is independent of OAuth scope and of the webhook subscription, both
of which are confirmed correct. Private replies to comments do not depend on it —
which is exactly why sends work while every inbox-derived event stays silent.

On `crafts__by__h`, in the Instagram app:

**Settings and privacy → Messages and story replies → Connected tools → Allow access to messages**

Some versions place it under **Business tools and controls → Connected tools**.
Flip it on, then have an unrelated account comment the keyword and tap the button.

If the toggle was already on, the hypothesis is dead. Go next to the webhook's
per-field **Recent Errors / Recent Deliveries** view in the App Dashboard to see
whether Meta is even attempting delivery for the messaging fields — that
separates "not sent" from "sent and rejected", which nothing so far has done.

### State the code is in

Opening DM and follow gate are **disabled in the UI** — greyed cards with a
"Soon" badge in `components/campaign-builder.tsx`, and the save payload hardcodes
`openingDmEnabled: false` / `requireFollow: false`. Existing rows were cleared in
the database. Basic automation (comment → DM with tracked link) is unaffected and
works for strangers end to end, in 4–7 seconds.

To re-test the postback path, flip `openingDmEnabled` on one automation directly
in SQL. **Do not open that campaign in the builder while testing** — saving wipes
the flag.

The follow gate was never tested independently. It is gated by inference: it
sends the same postback button (`followcheck:<id>`) through the same dead path.
It also has a second, unverified dependency — `getUserFollowStatus` reads
`is_user_follow_business`, and [`lib/queue/dm-worker.ts`](lib/queue/dm-worker.ts)
treats a `null` return as fail-open and delivers the link anyway. If that field
is restricted the gate will not error, it will silently pass everyone.

### If the webhook path cannot be made to work

Swap the postback button for a `web_url` button, which never touches the
messaging webhook family:

1. Opening DM goes out as a button template with `type: "web_url"` pointing at
   `https://replie.uz/api/reveal/<token>`, where the token is an HMAC-signed blob
   carrying `automationId` + the user's IGSID + an expiry. The IGSID is known at
   send time — it is `commenterId` from the comment webhook.
2. The tap opens Instagram's in-app browser on that endpoint, which verifies the
   signature, enqueues the same `process-postback` job, and returns a short
   "check your DMs" page.
3. `processPostback` is unchanged.

The send leg is already proven for outside users: `vitreen.uz`'s 22:14 DM went
out through `sendPrivateReplyWithLinkButton`, which emits `web_url` buttons. Cost
is a browser flash instead of the reveal landing instantly.

---

## Database migrations

Prisma 7 reads the datasource URL from `prisma.config.ts`, **not** `schema.prisma`.
Adding `url = env("DATABASE_URL")` to the schema's datasource block breaks the
build with P1012.

If you ever apply a migration by hand in the Supabase SQL editor, also insert its
row into `_prisma_migrations` — otherwise the next deploy tries to re-apply it,
fails, and records a *failed* migration, which then blocks every later deploy
with P3009. Recovering means setting `finished_at` on the failed row and deleting
any duplicate. Prefer letting `prisma migrate deploy` do the work.

---

## Dependencies — do not commit a Windows-regenerated lockfile

**Running `npm install` on Windows silently breaks CI.** It floats the hoisted
`@emnapi/core` and `@emnapi/runtime` off 1.10.0. `@rolldown/binding-wasm32-wasi`
pins those at *exactly* 1.10.0, so once the hoisted copy moves, Linux npm needs a
nested 1.10.0 pair — and npm on Windows never emits it, because it does not
expand that package's subtree (its `cpu: wasm32` constraint doesn't apply
locally). The result installs fine on the machine that wrote it and fails
everywhere else:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json ... are in sync.
npm error Missing: @emnapi/core@1.10.0 from lock file
```

**Before committing `package-lock.json`, run `git diff package-lock.json`.** If
you did not intend a dependency change, discard it:

```bash
git checkout HEAD -- package-lock.json
```

Regenerating is *not* the fix — every regeneration on Windows reproduces the same
unsatisfiable tree, and `npm ci --dry-run` passes locally while still failing on
Linux. If the lockfile genuinely needs updating, generate it on Linux (the GCP
VM, WSL, or a CI job), not on Windows.

This cost a debugging cycle on 2026-07-31 — including a wrong fix (bumping CI to
Node 24) that changed nothing. Node 24 was kept for unrelated reasons, below.

### Node version

CI and the `Dockerfile` both run **Node 24**. Prisma 7 pulls
`@prisma/streams-local`, which requires `node >=22` and logs `EBADENGINE` on
anything older; Node 20 is also past its GitHub Actions deprecation.

---

## i18n — Uzbek and Russian

Full locale routing added 2026-08-01. Every page now lives under `app/[lang]/`.

### How it works

- **Routes:** `/uz/*` serves Uzbek, `/ru/*` serves Russian. The root `/` and
  `/pricing` are redirect-only stubs that forward to `/uz`.
- **Middleware (`proxy.ts`):** On first visit to `/`, reads `Accept-Language` and
  redirects to `/uz` or `/ru`. Subsequent navigations use the URL prefix.
- **Dictionaries:** `lib/i18n/uz.ts` and `lib/i18n/ru.ts` implement the `Dict`
  interface from `lib/i18n/types.ts`. `getDictionary(lang)` is for server
  components; `useDict()` hook (via `DictionaryProvider` context) is for client
  components.
- **Template interpolation:** `t(str, { key: value })` replaces `{{key}}`
  placeholders in dictionary strings.
- **Language switcher:** `UZ | RU` pill in the public header (desktop + mobile)
  and `UZ | RU` links in the sidebar bottom. Switches by replacing the `[lang]`
  prefix in the current pathname.
- **Font:** `cyrillic-ext` subset added to Plus Jakarta Sans (covers Russian
  Cyrillic). `cyrillic` (without `-ext`) is not a valid subset for this font —
  use `cyrillic-ext`.

### Adding a new page

Create it under `app/[lang]/your-page/page.tsx`. For simple server-component
pages with no locale-specific logic, re-export the original:

```ts
export { default } from "@/app/your-page/page";
// or with metadata:
export { default, metadata } from "@/app/your-page/page";
```

### Adding a new string

1. Add the key to `lib/i18n/types.ts` (`Dict` interface).
2. Add the value to `lib/i18n/uz.ts` and `lib/i18n/ru.ts`.
3. Use `dict.yourKey` in the component.

### The DictionaryProvider rule

`DictionaryProvider` wraps only `app/[lang]/` children (via `app/[lang]/layout.tsx`).
Anything rendered outside that tree **must not** call `useDict()` — it throws at
build time during static prerendering. Every page now lives under `app/[lang]/`,
so in practice this only constrains new top-level routes.

### `t()` must come from `lib/i18n/t.ts`, never from the provider

`components/dictionary-provider.tsx` is a `"use client"` module. Anything exported
from it — including a pure helper — becomes a client reference, so calling it from
a **server** component throws at render time:

```
Attempted to call t() from the server but t is on the client.
```

This shipped undetected and 500'd `/[lang]/login?template=<slug>` (every "use this
template" deep link) because the failing branch only runs when a template param is
present. `t()` now lives in `lib/i18n/t.ts`, which carries neither `"use client"`
nor a `server-only` import, so both sides can call it. `dictionary-provider`
re-exports it for client callers.

- **Server component:** `import { t } from "@/lib/i18n/t"`
- **Client component:** either import works.

The same trap applies to any future helper — a pure function in a `"use client"`
file is still a client reference.

---

## Routing — one tree, and the routes that must stay locale-less

Every page lives under `app/[lang]/`. There is no second copy; `app/` holds only
what cannot take a locale prefix:

```
app/api/       app/r/       app/reports/
app/robots.ts  app/sitemap.ts  app/layout.tsx  app/globals.css
```

Until 2026-08-02 `app/` carried a full duplicate of nearly every page, and 15
files under `app/[lang]/` were one-line shims re-exporting from it. That tree was
unreachable as *routes* but load-bearing as *modules* — deleting it looked safe
and was not. It is now collapsed: the implementations moved into `app/[lang]/`.

### The middleware matcher is load-bearing

`proxy.ts` prefixes any unprefixed path with a locale. Anything with no page under
`app/[lang]/` **must** be excluded from `config.matcher`, or it redirects into a
404. Currently excluded — do not remove without adding a `[lang]` page first:

| Path | Why it can never take a locale |
|------|-------------------------------|
| `/api/*` | API routes |
| `/r/*` | Tracked links. `lib/tracking/message.ts` bakes `${APP_URL}/r/<slug>` into every DM, so these URLs are already in recipients' inboxes and cannot be changed retroactively. |
| `/reports/*` | Public client-report share links handed to third parties |
| `/robots.txt`, `/sitemap.xml` | Crawlers fetch these at the domain root |

This regressed once: the i18n migration sent `/r/<slug>` to `/uz/r/<slug>`, so
every tracked-link click 404'd and **no clicks were recorded** until 2026-08-02.
`__tests__/proxy-matcher.test.ts` guards it.

---

## Design system

Tokens live in `app/globals.css` under `@theme inline`. The scales are **closed
sets** — use only what is defined, and add to the token file rather than reaching
for a one-off value.

- **Type:** `text-xs` (11px floor) → `text-6xl`. No arbitrary `text-[Npx]`.
- **Radius:** `rounded-md` controls · `rounded-lg` cards · `rounded-full` pills. Nothing else.
- **Neutrals:** `foreground` primary · `muted` secondary · `subtle` tertiary.
- **Font:** Plus Jakarta Sans via `next/font/google` in `app/layout.tsx`
  (CSS variable `--font-plus-jakarta`). Subsets: `latin`, `latin-ext`, `cyrillic-ext`.
  Headings use weight 800 (`font-extrabold`). Do not use `font-black` (900).
- Never use raw Tailwind colors (`bg-zinc-*`, `text-gray-*`). Use tokens.

**Exception:** `components/campaign-preview.tsx` intentionally uses dark zinc and
`rounded-2xl` bubbles to mimic the Instagram UI. Do not "fix" it.

See [DESIGN_REVIEW.md](DESIGN_REVIEW.md) for the full audit.

---

## Landing page

Content lives at `app/[lang]/page.tsx`. There is no root `app/page.tsx`; `/`
reaches `/uz` through the locale middleware. Key decisions:

- **Logo:** Custom R glyph SVG, rendered inline in header and footer. Reads as
  "[R]eplie" — SVG is the R, followed by "eplie" in text. Gap between them is 4px.
- **Header:** Sticky with 4px accent-blue top bar, frosted-glass background,
  hamburger menu on mobile. Includes `UZ | RU` language switcher.
- **Hero:** Cinematic entrance animation — headline uses a blur-to-sharp focus
  pull (700ms), mockup rises from below with scale + blur clearing at 40% of a
  1s duration, description and CTAs cascade in with staggered delays. All
  keyframes in `globals.css` (`heroTextIn`, `heroSupportIn`, `heroMockupIn`).
  Classes: `.hero-enter`, `.hero-enter-d1`, `.hero-enter-d2`,
  `.hero-enter-mockup`. Uses `animation-fill-mode: backwards` for safe
  progressive enhancement; `prefers-reduced-motion` collapses all durations.
- **Sections:** No card containers or decorative wrappers. Steps use 2px
  accent-blue top border (ruled columns); features use 1px neutral top border.
  No pill badges, eyebrow labels, or icon boxes.
- **Pricing page:** Lives at `app/[lang]/pricing/page.tsx`. Three-plan grid
  (Free, Standard, Pro). Standard card highlighted with `border-2 border-accent`.

---

## Before real users

1. **Redis eviction policy** — the worker logs
   `Eviction policy is volatile-lru. It should be "noeviction"` on boot. Under
   memory pressure Redis Cloud can evict queued jobs, silently losing DMs. Change
   it in the Redis Cloud console if the free tier allows.
2. **Meta Advanced Access** — the real gate on self-serve signup. Until it is granted,
   the app holds **Standard Access**, which means "only for a business I own or
   manage": an Instagram account can only connect if it has been added by hand under
   **Use cases → Instagram API setup → Generate access tokens → Add account**. The
   OAuth flow itself is already self-serve and needs no code changes.
   See [Meta verification status](#meta-verification-status) below and
   [META_APP_REVIEW.md](META_APP_REVIEW.md).
3. **Opening DM and follow gate are disabled** — no Instagram messaging webhook has
   ever reached the app, so a button tap delivers nothing. Both features are hidden
   behind a "Soon" badge until this is resolved. App Review is *not* the cause; see
   [Messaging webhooks have never fired](#messaging-webhooks-have-never-fired--open-investigation-2026-08-03)
   for what is ruled out and what to try next.
4. **Cron auth falls back to `NEXTAUTH_SECRET`** — which now signs every session
   JWT, so leaking it means forging any user's session. One line to delete; see
   finding 1 in [SECURITY_AUDIT.md](SECURITY_AUDIT.md).
5. **Open redirect on `replie.uz/r/*`** — `z.string().url()` allowlists no scheme
   or host, so a paying user can point a tracked link anywhere and have it DM'd
   from your domain. Finding 3 in [SECURITY_AUDIT.md](SECURITY_AUDIT.md).
6. **Session revocation** — sessions are JWT-backed and cannot be revoked
   server-side (see [Auth](#auth--password-sign-in-magic-link-as-fallback)).
7. **Connection pool headroom** — `max: 1` is per-instance; enough concurrent
   Vercel instances still reach Supabase's 15-client cap. Move to the
   transaction-mode pooler (port 6543) before real traffic.

~~`EMAIL_FROM` using Resend sandbox sender~~ — fixed: `login@replie.uz` verified.
~~Domain not purchased~~ — fixed: `replie.uz` live.
~~Meta app credentials~~ — fixed 2026-08-02: app `replie` created and
**published**, Instagram-specific `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` set
on Vercel (these differ from the top-level Meta App ID — take them from
**Use cases → Instagram API setup**, not App Settings → Basic), webhook verified
at `https://replie.uz/api/webhook`, redirect URI
`https://replie.uz/api/instagram/callback`.

---

## Meta verification status

Where the App Review path stands as of 2026-08-02, so the next attempt does not start
from zero.

**Done:**

- App `replie` created and **published**. Instagram-specific `INSTAGRAM_APP_ID` /
  `INSTAGRAM_APP_SECRET` set on Vercel (these are **not** the top-level Meta App ID and
  secret — take them from Use cases → Instagram API setup).
- Webhook verified at `https://replie.uz/api/webhook`, redirect URI
  `https://replie.uz/api/instagram/callback`.
- `ceo.syr` added under **Generate access tokens** and connected end to end. That was
  the missing step that made every Graph call fail with code 100.
- **Tech Provider status granted.** This is what unlocks App Review — the dashboard
  card said "Become a Tech Provider to submit to App Review and request access to user
  data and data from other businesses." Accepting it replaced the **Testing** item in
  the left sidebar with a **Review** section containing *Testing*, *Verification*, and
  *App Review*.
- At least one successful API call, which Advanced Access requires.

**Next, in this order:**

1. **Review → Verification.** Do this *before* writing App Review justifications —
   submissions get blocked without it, so there is no point drafting first.
   The business-type picker offers **Sole proprietorship**, which maps to **YaTT**
   (Yakka tartibdagi tadbirkor) in Uzbekistan — far cheaper and faster than
   registering an MChJ (the LLC equivalent). Meta will want a legal business name and
   address plus a document proving the entity exists.

   > **Do not submit before the registration actually exists**, and match the legal
   > name exactly as printed on the document. Meta cross-checks it, and a rejected
   > verification is slower and more scrutinised to re-submit than getting it right
   > once.

2. **Review → App Review.** [META_APP_REVIEW.md](META_APP_REVIEW.md) already has
   permission justifications and a screencast script, but it is **stale in three ways**
   and will fail review as written:
   - It lists 3 permissions; the code requests **4**. `instagram_business_manage_insights`
     is missing and is real — it powers the overview page, and the callback log confirms
     Instagram grants it. Either justify it or drop the scope and the feature.
   - The screencast script says "sign in with an email magic link". Signup is now email
     + password; the magic link is the fallback. Reviewers follow the script literally.
   - It says "OpenReply" throughout, not replie.

**Meanwhile:** accounts can still be onboarded by hand through **Review → Testing** —
the same flow that connected `ceo.syr`. Good enough for the first handful of customers
while verification is pending.

---

## Key files

| What | File |
|------|------|
| Design tokens + hero animations | `app/globals.css` |
| Root layout / font | `app/layout.tsx` |
| Landing page | `app/[lang]/page.tsx` |
| Pricing page | `app/[lang]/pricing/page.tsx` |
| Auth config (providers, JWT sessions) | `lib/auth.ts` |
| Password hashing (scrypt) | `lib/auth/password.ts` |
| Sign up / sign in / set password | `app/[lang]/signup/`, `app/[lang]/login/`, `app/[lang]/set-password/` |
| Instagram OAuth callback | `app/api/instagram/callback/route.ts` |
| Meta Graph client | `lib/meta/client.ts` |
| DB client + pool config | `lib/db/client.ts` |
| i18n dictionaries | `lib/i18n/uz.ts`, `lib/i18n/ru.ts`, `lib/i18n/types.ts` |
| Dictionary context + hook | `components/dictionary-provider.tsx` |
| `t()` interpolation (server-safe) | `lib/i18n/t.ts` |
| Locale middleware | `proxy.ts` |
| Dashboard layout (lang) | `app/[lang]/(dashboard)/layout.tsx` |
| Worker entry | `worker/dm-worker.ts` |
| Worker job logic | `lib/queue/dm-worker.ts` |
| Worker image CI | `.github/workflows/worker-image.yml` |
| Docker config | `Dockerfile` |
| Prisma schema | `prisma/schema.prisma` |
| Prisma datasource | `prisma.config.ts` |
| Plan limits | `lib/billing/plan.ts` |
| Public header / footer | `components/public-site-header.tsx`, `components/public-site-footer.tsx` |
| Sidebar | `components/sidebar.tsx` |

**Known gap** — the dashboard pages under `app/[lang]/(dashboard)/` (settings,
logs, inbox, overview, automations, campaigns, diagnostics) are hardcoded Uzbek
and do not call `useDict()`, so `/ru/settings` renders Uzbek. This predates the
route consolidation — the shims re-exported the same Uzbek implementation — but
it is now visible in one place. Translating them is unfinished i18n work, not a
regression.
