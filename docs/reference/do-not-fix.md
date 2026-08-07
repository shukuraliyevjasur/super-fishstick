# Do not "fix" these

Time was spent proving each of these is fine. **Re-reporting one is a regression in
itself.** Extracted from the 2026-08-02 pre-launch review
([archive](../archive/2026-08-04-fix-brief.md)) so it stays findable now that the review
ledger is closed.

---

## Investigated and discarded

**XSS via `postUrl` in the public report page.** A user-controlled value reaches `href` at
`app/reports/[shareSlug]/page.tsx` on an unauthenticated page. Tested against React 19.2.4:
it rewrites `javascript:` hrefs to
`throw new Error('React has blocked a javascript: URL as a security precaution.')`.
Not exploitable. **Re-test only if React is ever downgraded.**

**IDOR on `/api/instagram/conversations/[id]`.** `conversationId` is taken unvalidated from
the URL, but the request uses the caller's own Instagram token, so Meta refuses another
workspace's conversation. Relies on Meta's enforcement rather than a local check —
defensible.

**Rate limiting / DoS** and **timing analysis of bearer comparisons.** Out of scope for
that pass, not concretely exploitable.

**Scheme validation does not stop the open-redirect attack.** `https://evil.example/phish`
is a valid http URL and is still accepted. What closes phishing laundering is host-level
policy or abuse response, not URL validation. The validator removes the non-http classes
and makes the value type-safe; do not mistake it for more than that.

**Private / link-local hosts are deliberately not blocked** in `lib/validation/url.ts`.
Nothing server-side fetches these values — they go to the visitor's browser — so there is
no SSRF to prevent. Revisit only if any of these URLs ever becomes something the server
fetches.

---

## Verified correct — leave alone

**Send deduplication** — a unique constraint on `(automationId, commentId)`, not
application logic. A duplicated webhook physically cannot double-send.

**Quota reservation** — `reserveWorkspaceDMSend` does the period reset and the reservation
inside one `prisma.$transaction`. Concurrent sends cannot overshoot.

**Rate limiting** — `reserveDMSlot` distinguishes requeue from skip and carries a backoff
delay rather than dropping jobs. Cap is 750/hr, Meta's documented limit for private replies.

**Token encryption** — AES-256-GCM, random IV per token, auth tag verified on decrypt.

**Webhook signatures** — HMAC-SHA256 via `timingSafeEqual`, wrapped so the length-mismatch
throw cannot bypass verification. It accepts either the Facebook or Instagram app secret on
purpose.

**RLS** — enabled on all 15 tables. Prisma connects as superuser, so this is
defense-in-depth against a leaked anon key. Correct posture.

**Workspace membership** — `canManageWorkspace` on every mutation, `OWNER` protected from
demotion and deletion, self-deletion blocked, invitations check expiry *and* that the
session email matches.

**Report share slugs** — `randomBytes(9)`, 72 bits. Unguessable.

**The three `.catch(() => {})`** in `lib/polling/comment-reconciler.ts`,
`lib/queue/dm-worker.ts`, and `app/api/webhook/route.ts` — each deliberate and commented.

**`components/campaign-preview.tsx`** intentionally uses dark zinc and `rounded-2xl` to
mimic the Instagram UI, against the design system. Documented exception — see
[design-system.md](design-system.md).

**Lint warnings are not errors.** The bar is **0 errors**. Warnings are pre-existing and
fine.

> A stale git worktree at `.claude/worktrees/feat+f6-rsc-conversion` was producing 98 lint
> errors from its own `.next/types/routes.d.ts` build artifacts. Removed 2026-08-07. If
> lint errors ever reappear from a path you did not write, check `git worktree list` first.
