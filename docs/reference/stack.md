# Stack

Everything OpenReply needs to run, in one place: the application libraries, the
runtime processes, and the specific (free) services this instance is deployed on.
For the step-by-step setup, see [setup.md](setup.md).

## Application

| Layer | Tool |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Language | TypeScript 5 |
| ORM / DB | Prisma 7 with the `@prisma/adapter-pg` driver, PostgreSQL |
| Queue | BullMQ 5 on Redis, via `ioredis` |
| Auth | Auth.js / NextAuth 5 (email magic links) |
| Email | Resend (login links) |
| Validation | Zod 4 |
| Charts | Recharts 3 |
| Styling | Tailwind CSS 4 |
| Tests | Vitest 4 |
| Worker runtime | `tsx` (runs `worker/dm-worker.ts`) |
| Instagram | Official Meta Graph API (Instagram Login) |

## Runtime — two processes, two datastores

- **Web app + API** (`npm run dev` / `npm start`): Next.js. Serves the dashboard,
  the OAuth callback, and the incoming webhook. Serverless-friendly; runs on Vercel.
- **Worker** (`npm run worker`): a long-running Node process. Consumes the send
  queue, sends the DMs, runs the polling reconciler, and performs the follow-gate
  `is_user_follow_business` checks. **Must stay always-on**, so it cannot run on
  Vercel — it needs an always-on host.
- **PostgreSQL**: campaigns, DM logs, accounts, sessions, tracked links, click events.
- **Redis**: the BullMQ send queue and the per-account rate limiter. Must speak the
  native Redis protocol over TCP (an HTTP-only Redis will not work with BullMQ).

The web app and the worker must share the same `DATABASE_URL`, `REDIS_URL`, and
`ENCRYPTION_KEY`. The web app stores the encrypted Instagram token; the worker
decrypts it to send. Different keys mean every send fails to decrypt.

## Reference free deployment

The zero-cost stack this instance runs on. Alternatives (e.g. Railway for the
worker + Postgres + Redis) are covered in [setup.md](setup.md).

| Piece | Service | Free tier |
| --- | --- | --- |
| Web app | Vercel (Hobby) | Free |
| PostgreSQL | Supabase (session-mode pooler, port 5432) | Free (~0.5 GB) |
| Redis | Redis Cloud (Essentials) | Free (30 MB, TCP) |
| Worker (24/7) | GCP Compute Engine e2-micro (Debian, standard persistent disk, Docker with `--restart always`) | Always Free |
| Login email | Resend | Free (3k emails/mo) |
| Instagram API | Meta app with Instagram Login | Free |

Notes on the two that have caveats:

- **Supabase** — use the *session-mode pooler* host on port 5432. The direct
  connection resolves to IPv6 only, which Vercel's builders cannot reach.
- **GCP e2-micro** — Always Free requires `us-central1`, `us-west1`, or
  `us-east1` and a *standard* persistent disk; a balanced/SSD disk bills. The VM
  is too small to build the worker image itself, so CI builds it and the VM
  pulls — see [HANDOFF.md](../HANDOFF.md#worker).

Fly.io is no longer viable for the worker: its free allowance is now a 7-day
trial, after which a shared-cpu-1x instance bills roughly $2–5/month.

## Environment variables

Names only — values live in `.env` (gitignored) or the host's env settings, never
in the repo. Full descriptions are in [setup.md](setup.md#environment-variables).

`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`,
`REDIS_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `META_GRAPH_API_VERSION`,
`INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`,
`WEBHOOK_VERIFY_TOKEN`.
