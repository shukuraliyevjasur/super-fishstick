<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Read before working on this project

- **[DECISIONS.md](DECISIONS.md)** — settled product and architecture calls, with the
  reasoning. Do not quietly do something different from what is recorded there. If you
  think a decision should be reversed, say so explicitly.
- **[FIX_BRIEF.md](FIX_BRIEF.md)** — the open findings from the 2026-08-02 pre-launch
  review, each with file, fix, and verification. Also lists what has already been
  investigated and proven **not** to be a problem, so it does not get re-reported.
- **[HANDOFF.md](HANDOFF.md)** — how the project is deployed and the traps that cost
  real debugging time (Windows lockfile breaking CI, Prisma 7's datasource location,
  the locale middleware matcher, Instagram code 100 meaning an unlinked account).

**Billing, in one line:** paid plans are granted by an admin endpoint for now, and move
to a payment webhook (Click / Payme / Uzum) as soon as that integration is practical —
build the granting logic so swapping the trigger is cheap. See D2 in DECISIONS.md.

**Before committing:** run `git diff package-lock.json`. If you did not intend a
dependency change, discard it — a lockfile regenerated on Windows installs fine locally
and breaks `npm ci` on Linux.
