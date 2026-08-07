# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ
from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
writing any code. Heed deprecation notices.

# Read before working on this project

Docs live in **[docs/](docs/)**. Start with **[docs/README.md](docs/README.md)** — it is
the map and it names the reading order.

**If you are here to build something**, go straight to
**[docs/START-HERE.md](docs/START-HERE.md)** — the ordered execution plan from the
2026-08-07 review pass, with every task resolved to concrete files, verify steps, and the
ordering constraints that will bite if ignored.

The four that matter most:

- **[docs/product/decisions.md](docs/product/decisions.md)** — settled product and
  architecture calls, with the reasoning. Do not quietly do something different from what
  is recorded there. If you think a decision should be reversed, say so explicitly.
- **[docs/reference/traps.md](docs/reference/traps.md)** — the landmines. Windows breaking
  CI via the lockfile, Prisma 7's datasource location, the locale middleware matcher,
  Instagram code 100 meaning an unlinked account, and why messaging webhooks can never
  work under Standard Access. Each of these was paid for once already.
- **[docs/reference/do-not-fix.md](docs/reference/do-not-fix.md)** — things proven **not**
  to be a problem, so they do not get re-reported. Re-reporting one is a regression.
- **[docs/product/roadmap.md](docs/product/roadmap.md)** — what is being built and in what
  order, carrying the CEO, engineering and design decisions from the 2026-08-07 review.

Operational detail — deployment, env vars, runbooks, the "before real users" list — is in
**[docs/operations/handbook.md](docs/operations/handbook.md)**.

**Billing, in one line:** paid plans are granted by an admin endpoint for now, and move to
a payment webhook (Click / Payme / Uzum) as soon as that integration is practical — build
the granting logic so swapping the trigger is cheap. See D2 in
[decisions](docs/product/decisions.md).

**Two things are blocked externally, not on code.** Meta Advanced Access needs Business
Verification, which needs a legal entity; it caps the app at 50 Instagram accounts and
makes every inbound-DM feature structurally impossible. Payment rails are blocked on the
same entity. Do not design around either without asking.

**Before committing:** run `git diff package-lock.json`. If you did not intend a
dependency change, discard it — a lockfile regenerated on Windows installs fine locally
and breaks `npm ci` on Linux.

**Baseline** (verified against the code 2026-08-07): **240 tests passing across 26 files**,
lint **0 errors**, typecheck silent after `npm ci`. If those stop matching, the code
changed — find out why before starting.
