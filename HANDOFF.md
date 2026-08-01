# replie — Agent Handoff

**Last updated:** 2026-08-01

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

> **`ENCRYPTION_KEY` must be byte-for-byte identical on Vercel and the worker.**
> It encrypts stored Instagram OAuth tokens: the web app writes them, the worker
> decrypts them to send. A mismatch means every DM fails to decrypt. It was
> rotated on 2026-07-31, which invalidated any previously stored tokens —
> connected accounts must reconnect. Generate with `openssl rand -hex 32`.

`APP_URL` is `https://replie.uz`. It builds tracked links inside sent DMs and
must be set on both Vercel and the worker docker run.

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
Pages outside that tree (root `app/page.tsx`, `app/pricing/page.tsx`) **must not**
render components that call `useDict()` — it throws at build time during static
prerendering. Those stubs are now simple `redirect()` calls.

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

Content lives at `app/[lang]/page.tsx` (not `app/page.tsx` — that is now a
redirect stub). Key decisions:

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

1. **Meta app credentials** — confirm `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`
   exist and the webhook is subscribed. Without them nobody can connect an
   account and the product does nothing.
2. **Redis eviction policy** — the worker logs
   `Eviction policy is volatile-lru. It should be "noeviction"` on boot. Under
   memory pressure Redis Cloud can evict queued jobs, silently losing DMs. Change
   it in the Redis Cloud console if the free tier allows.
3. **Meta App Review** — needed only to let people outside your test users
   connect their own accounts. See [META_APP_REVIEW.md](META_APP_REVIEW.md).

~~`EMAIL_FROM` using Resend sandbox sender~~ — fixed: `login@replie.uz` verified.
~~Domain not purchased~~ — fixed: `replie.uz` live.

---

## Key files

| What | File |
|------|------|
| Design tokens + hero animations | `app/globals.css` |
| Root layout / font | `app/layout.tsx` |
| Landing page | `app/[lang]/page.tsx` |
| Pricing page | `app/[lang]/pricing/page.tsx` |
| i18n dictionaries | `lib/i18n/uz.ts`, `lib/i18n/ru.ts`, `lib/i18n/types.ts` |
| Dictionary context + hook | `components/dictionary-provider.tsx` |
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

**Dead code** — `seo-page-shell.tsx`, `template-visual.tsx`, `lib/seo-pages.ts`.
The pages that used them now redirect to `/`, so they never render. Left in place
to avoid churn; they still contain raw zinc colors, so ignore them when auditing
design tokens.
