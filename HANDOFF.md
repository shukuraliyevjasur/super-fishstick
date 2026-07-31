# replie — Agent Handoff

## What this is

**replie** (`replie.uz`) is a paid SaaS for the Uzbek market built on top of the OpenReply fork.
It automates Instagram comment-to-DM campaigns (keyword triggers, follow gates, tracked links).

All branding, UI copy, and pricing have been finalized. The codebase is deployment-ready.

---

## Deployment stack

| Layer | Platform | Notes |
|-------|----------|-------|
| Web app | Vercel | Next.js 16 App Router |
| Database | PostgreSQL | Any provider (Neon, Supabase, Railway) |
| Queue / cache | Redis | BullMQ needs blocking commands — Upstash free tier hits 10k/day limit fast; use Upstash paid or Railway Redis |
| Background worker | Fly.io | Always-on process, no HTTP port |
| Email | Resend | Magic-link auth |
| Domain | replie.uz | Not yet purchased |

**Worker must stay running 24/7.** It processes Instagram DM jobs from BullMQ queues.
HTTP-only Redis services (Upstash REST API) do NOT work for the worker — it needs raw TCP Redis.

---

## Key brand values

| Field | Value |
|-------|-------|
| Product name | replie |
| Domain | replie.uz |
| Email | info@replie.uz |
| Telegram | https://t.me/ceo_syr |
| Headline | Izohlaringiz o'zi ishlaydi |
| Tier 1 | Standart — 19 000 so'm/oy |
| Tier 2 | Pro — 29 000 so'm/oy |

---

## What's done

- Full Uzbek translation across all pages and components
- Light B2B theme (`#EDF1F5` bg, `#0145F2` accent) replacing all dark zinc classes
- Semantic design tokens: `bg-surface`, `text-muted`, `border-border`, `bg-accent`, etc.
- Pricing page (`app/pricing/page.tsx`) — two-tier, Telegram CTA
- All placeholder tokens replaced (`[PRODUCT_NAME]`, `[HEADLINE_PLACEHOLDER]`, etc.)
- Auth email sender: `replie <login@example.com>` → uses `EMAIL_FROM` env var
- SEO pages that don't apply now redirect to `/` (templates, comment-link-automation)
- `Dockerfile` and `fly.toml` for the worker — ready to `fly deploy`
- `NEXTAUTH_URL` in fly.toml env section

## What's NOT done (needs action before go-live)

1. **Environment variables** — not set on Vercel or Fly.io yet
2. **Domain** — `replie.uz` not purchased yet; update `NEXTAUTH_URL` when live
3. **Meta app** — Instagram App ID/Secret need to be created in Meta Developer Console
4. **Database** — PostgreSQL provider not chosen, no migrations run yet
5. **Redis** — provider not chosen
6. **Resend account** — API key not created
7. **`fly deploy`** — worker not deployed yet (Dockerfile is ready)
8. **Vercel deployment** — not triggered yet

---

## Architecture notes

### Design token system

All colors use semantic tokens defined in `app/globals.css` under `@theme inline`.
Never use raw Tailwind color classes (`bg-zinc-*`, `text-gray-*`) in new code — use tokens.

**Exception**: `components/campaign-preview.tsx` phone mockup intentionally uses dark zinc
colors to simulate the Instagram UI. Do NOT change these.

### Worker

- Entry: `worker/dm-worker.ts`
- Runtime: `tsx` (TypeScript, no compile step)
- Runs: BullMQ worker + heartbeat every 30s + polling reconciler
- Start command: `npm run worker`
- Required env vars: `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `NEXTAUTH_URL`

### Vercel build script

```
prisma generate && prisma migrate deploy && next build
```
(The `vercel-build` npm script already contains this.)

### ENCRYPTION_KEY

Must be **byte-for-byte identical** on Vercel and on the Fly.io worker.
It's used to encrypt/decrypt stored Instagram OAuth tokens.
Generate once with: `openssl rand -hex 32`

### Dead code (safe to ignore, do not render)

`seo-page-shell.tsx`, `template-visual.tsx`, `lib/seo-pages.ts` — all pages that used
these now redirect to `/`, so they're never rendered. Left in place to avoid risk.

---

## File locations for key things

| What | File |
|------|------|
| Design tokens | `app/globals.css` |
| Pricing page | `app/pricing/page.tsx` |
| Auth config | `lib/auth.ts` |
| Worker entry | `worker/dm-worker.ts` |
| Fly.io config | `fly.toml` |
| Docker config | `Dockerfile` |
| Prisma schema | `prisma/schema.prisma` |
| DB client | `lib/db/client.ts` |
