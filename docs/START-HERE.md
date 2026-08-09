# Start here

## Product goal

Onboard a small group of Uzbek agencies and SMM professionals before Meta App Review. Add their
Instagram accounts as test users, grant plans manually, and use the pilot to learn what sells.
Do not spend the current cycle on payment rails or Meta review mechanics unless the owner asks.

## Telegram model

Telegram is complete only when the workspace's own bot is working end to end:

1. On **Broadcasts**, the workspace admin watches the BotFather tutorial and connects a token.
2. replie validates the token, stores it encrypted, and installs that bot's authenticated webhook.
3. The owner opens the bot and presses **Start**; this is needed before a test message can arrive.
4. A Telegram-enabled campaign creates a `t.me/<workspace-bot>?start=<campaignId>` link.
5. A lead starts that bot, runs its flow, and becomes eligible for broadcasts from that same bot.

Telegram will not let Bot A message someone who only started Bot B. Therefore shared-bot contacts
are never a valid audience for a workspace bot, and `@replieuz_bot` must not be used for customer
campaigns or broadcasts.

## Key implementation locations

| Concern | Location |
|---|---|
| Own bot token, webhook setup and validation | `lib/telegram/own-bot.ts` |
| Own webhook route | `app/api/telegram/webhook/own/[workspaceId]/[secret]/route.ts` |
| Bot-bound conversation processing | `lib/queue/telegram-worker.ts` |
| Bot-bound broadcasts | `lib/telegram/broadcast.ts` |
| Broadcast connection/tutorial UI | `components/broadcasts/broadcast-list.tsx` |
| Database binding | `prisma/schema.prisma` |

## Before pushing

```powershell
git diff package-lock.json
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/x'; npm.cmd run db:generate
npm.cmd run typecheck
npm.cmd test
```

`package-lock.json` must not be regenerated on Windows. Use `npm ci`, never `npm install`.
