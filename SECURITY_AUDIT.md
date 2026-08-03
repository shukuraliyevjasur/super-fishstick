# Security audit — 2026-08-02

Full-scope audit of the app before opening it to real users. Nothing was fixed as
part of the audit itself; findings 1, 3, 4 and 5 were fixed on 2026-08-03.

This is not the disclosure policy — see [SECURITY.md](SECURITY.md) for that.

## Findings

| # | Sev | Status | Finding | File |
|---|-----|--------|---------|------|
| 1 | **HIGH** | **fixed** `cb52797` `c346cbf` | Cron auth falls back to `NEXTAUTH_SECRET`, now the JWT signing key | `app/api/cron/refresh-tokens/route.ts:10`, `app/api/cron/attach-next-reel/route.ts:22` |
| 2 | MED | open | `/api/admin/diagnostics` has no admin check | `app/api/admin/diagnostics/route.ts:10` |
| 3 | MED | **fixed** | Open redirect on `replie.uz/r/*` — no scheme or host allowlist | `app/api/automations/route.ts:46`, `app/r/[slug]/route.ts:42` |
| 4 | LOW | **fixed** `c346cbf` | `/api/health` auth is conditional; leaks DB/Redis errors when unset | `app/api/health/route.ts:60` |
| 5 | LOW | **fixed** | CSV import accepts any string as `postUrl`; JSON route requires a URL | `app/api/automations/import/route.ts:15` |

Findings are kept after they land, with the commit, rather than deleted — the
reasoning is worth more than the tidiness, and a re-audit that rediscovers a
closed finding needs to know it was closed deliberately.

---

### 1. Cron auth falls back to the JWT signing key — HIGH

```ts
const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
```

Latent today because `CRON_SECRET` is set. It became materially worse on 2026-08-02
when sessions moved from database to JWT: `NEXTAUTH_SECRET` now signs every session
token, so anyone holding it can forge a session for any user without a password.

**Exploit path.** `CRON_SECRET` is removed or renamed in Vercel — a rotation, a
project migration, a typo. The fallback activates silently. `NEXTAUTH_SECRET` then
travels as `Authorization: Bearer <jwt-signing-key>` on every cron invocation, into
Vercel's cron config, request logs, and any proxy between. One log leak escalates to
full account takeover across every account.

**Fix.** Delete the fallback. Require `CRON_SECRET` and let the route 401 without it —
a failing cron is an alert, a cron quietly authenticating with the signing key is not.

### 2. `/api/admin/diagnostics` is not admin-only — MEDIUM

The route is named `admin` but the only check is `getCurrentWorkspaceId()`, which any
signed-up user passes. Most queries are workspace-scoped; three are not —
`getDMQueue().getJobCounts()`, `getWorkerHealth()` / `getWorkerAlerts(10)`, and the
`operationalEvents` query, which explicitly includes `{ workspaceId: null }`.

**Exploit path.** Any user signs up free, calls the endpoint, and reads platform-wide
queue depth, worker health, and system event messages belonging to no tenant.
Webhook body previews do **not** leak — `payload` is not selected on the global query.

**Fix.** Gate on workspace role (owner/admin), or scope the three global queries.

### 3. Open redirect on the app's own domain — MEDIUM

`z.string().url()` has no scheme allowlist. Verified acceptance:

```
true   https://evil.example/phish
true   javascript:alert(1)
true   data:text/html,<h1>x
true   file:///etc/passwd
true   http://169.254.169.254/latest/meta-data/
```

`app/r/[slug]/route.ts:42` passes the stored value straight to `NextResponse.redirect()`.

**Exploit path.** An attacker signs up, pays for Standard (~47k UZS), creates a campaign
whose `destinationUrl` is a phishing page, and receives `https://replie.uz/r/<slug>`
pointing anywhere. Those links are DM'd to third parties from the product's own domain.
Consequences are phishing laundering under the brand, and `replie.uz` being flagged by
Safe Browsing or Meta — which breaks every legitimate customer's links at once.

`javascript:` is not the risk here (browsers do not execute it from a `Location`
header). An ordinary `https://` attacker host is.

**Fix.** Allowlist `http`/`https` at the schema, and reject link-shortener and
known-abuse hosts if you want a second layer.

### 4. `/api/health` auth is conditional — LOW

`if (secret)` — the bearer check only applies when `CRON_SECRET` is set. If it ever
goes missing the endpoint becomes public and returns raw DB/Redis error strings. The
`EMAXCONNSESSION` error seen on 2026-08-02 includes pool internals. Same fragile
pattern as finding 1.

### 5. `postUrl` unvalidated on the CSV import path — LOW

`app/api/automations/import/route.ts:15` uses `z.string()`; the JSON route at
`app/api/automations/route.ts:25` uses `z.string().url()`. Inconsistent. Low impact —
see the discarded XSS candidate below.

---

## Checked and clean

Recorded so the next audit does not re-derive it:

- **Token encryption** — AES-256-GCM, random IV per token, auth tag verified on decrypt.
- **Webhook signatures** — HMAC-SHA256 via `timingSafeEqual`, wrapped so the
  length-mismatch throw cannot bypass verification.
- **RLS** — enabled on all 15 tables. Prisma connects as superuser, so this is
  defense-in-depth against a leaked anon key, which is the correct posture.
- **Workspace membership** — `canManageWorkspace` on every mutation, `OWNER` protected
  from demotion and deletion, self-deletion blocked. Invitations check expiry *and*
  that the session email matches the invited address.
- **Report share slugs** — `randomBytes(9)`, 72 bits. Unguessable.
- **Git history** — no env file has ever been tracked.

## Candidates investigated and discarded

Both looked real. Recording why they are not, so they are not re-reported:

- **XSS via `postUrl` in the public report page.** A user-controlled value reaches
  `href` on an unauthenticated page (`app/reports/[shareSlug]/page.tsx:300`). Tested
  against React 19.2.4: it rewrites `javascript:` hrefs to
  `throw new Error('React has blocked a javascript: URL as a security precaution.')`.
  Not exploitable. **Re-test if React is ever downgraded.**
- **IDOR on `/api/instagram/conversations/[id]`.** `conversationId` is taken unvalidated
  from the URL, but the request uses the caller's own Instagram token, so Meta refuses
  another workspace's conversation. Relies on Meta's enforcement rather than a local
  check — defensible, worth a local check if it ever gets cheap.

Also considered and excluded as out of scope for this pass: rate limiting and
resource exhaustion (denial of service), and timing analysis of the bearer-token
comparisons (not concretely exploitable).
