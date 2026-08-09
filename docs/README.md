# replie docs

These are the current, pilot-first docs. Historical review plans live in
[`archive/`](archive/) and are not required reading for normal work.

Read in this order:

1. [`START-HERE.md`](START-HERE.md) — the product goal, Telegram journey, and verification commands.
2. [`product/decisions.md`](product/decisions.md) — settled calls; do not silently reverse one.
3. [`reference/traps.md`](reference/traps.md) — Windows, Prisma, routing, and Telegram landmines.
4. [`operations/handbook.md`](operations/handbook.md) — deployment and operator runbooks.
5. [`product/backlog.md`](product/backlog.md) — only genuinely deferred work.

## Current pilot model

Instagram accounts are onboarded as Meta test users while verification is pending. Plans are
granted manually; payment rails and App Review are external blockers, not current engineering
work.

Telegram is customer-owned:

`Instagram campaign → workspace bot → /start flow → bot-specific broadcast audience`

Each workspace connects its own BotFather token from **Broadcasts** (the in-product tutorial is
shown there). That bot runs the campaign flows and can broadcast only to people who started that
same bot. `@replieuz_bot` is not a customer campaign or broadcast channel.

## Verification

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/x'; npm.cmd run db:generate
npm.cmd run typecheck
npm.cmd test
```

Run `npm.cmd run lint` separately. It has zero project errors; checked-in agent skill folders
currently produce warnings.

Never run `npm install` on Windows. See [`reference/traps.md`](reference/traps.md).
