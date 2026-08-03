# Starting prompt for a fixing agent

Copy the block below into a fresh agent session pointed at this repo.

Kept as a file so it survives, and so it can be edited as findings land — when a
finding is fixed, delete it from `FIX_BRIEF.md` rather than editing this prompt.

---

```
You're picking up replie, a live Instagram comment-to-DM SaaS (Next.js 16, Prisma 7,
Supabase Postgres, BullMQ/Redis, worker on a GCP VM). It's deployed at replie.uz but
not yet open to real users. Your job is to work through the findings from a pre-launch
review.

START HERE, in this order:
1. AGENTS.md      - loads automatically; points at everything else
2. DECISIONS.md   - settled calls. Do not quietly do something different. If you think
                    one should be reversed, say so out loud.
3. FIX_BRIEF.md   - your actual worklist. 19 findings, each with severity, file:line,
                    the failure it causes, a concrete fix, and how to verify.
4. HANDOFF.md     - deployment, and the traps that cost real debugging time.

Before writing any code, confirm the baseline:
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x" npm run db:generate
  npm run typecheck && npm run lint && npm test

Expected: typecheck silent, lint 0 errors (304 warnings are pre-existing and fine),
125 tests passing across 16 files. If that doesn't match, stop and tell me before
changing anything.

How I want you to work:
- One finding per commit. Re-run the full verification after each one.
- Follow the suggested order at the bottom of FIX_BRIEF.md unless you have a reason
  not to. Start with S1: it's a one-line deletion that removes a session-forgery path.
- Read the "Do NOT fix these" section before you touch anything. Two findings were
  investigated and disproved, and several parts are verified correct. Re-reporting
  them or "fixing" working code is a regression.
- ALWAYS run `git diff package-lock.json` before committing. If you didn't intend a
  dependency change, discard it. A lockfile regenerated on Windows installs fine
  locally and breaks `npm ci` on Linux. Several fixes are deliberately written to add
  zero dependencies for this reason.
- Don't start P1 (the admin plan endpoint) without reading D2 in DECISIONS.md first.
  The decision is made, but there's a constraint that's the whole point of it.
- If something contradicts the brief, tell me rather than guessing. The brief was
  written from verified evidence, so a contradiction means something changed.

Begin by confirming the baseline and telling me which finding you're starting with
and why.
```

---

## Two things to watch

**The brief is deliberately opinionated about what not to do.** Roughly a third of it
is landmines and disproved findings. That is the part that saves money — without it an
agent will re-derive the Instagram code-100 dead end (six deploys), re-report the
React 19 href XSS, or regenerate the lockfile on Windows and break CI.

**P1 is the one worth checking.** The decision is recorded, but the constraint that
makes it non-throwaway — putting the granting logic in a reusable function so the
payment webhook can call it later — is easy to skip if the agent optimises for "make
the endpoint work". If it writes the logic inline in the route, have it pulled out
before merging.

## Baseline verified

2026-08-02, commit `b5214a9`: working tree clean, nothing unpushed, CI green,
typecheck silent, lint 0 errors / 304 warnings, 125 tests passing across 16 files.

Commits after this one have been documentation only, so the numbers above still hold.
If they ever stop matching, the code changed — find out why before starting work.
