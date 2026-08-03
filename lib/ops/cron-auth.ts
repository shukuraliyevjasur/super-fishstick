import { NextResponse } from "next/server";

/**
 * Bearer auth for the operational endpoints — cron routes and `/api/health`.
 *
 * Returns a 401 response when the caller is not authorised, or `null` when the
 * request may proceed:
 *
 * ```ts
 * const unauthorized = requireCronAuth(request);
 * if (unauthorized) return unauthorized;
 * ```
 *
 * Two properties are deliberate, and both are fail-closed:
 *
 * - **No fallback secret.** `CRON_SECRET` is the only accepted credential. It
 *   previously fell back to `NEXTAUTH_SECRET`, which signs every session JWT —
 *   putting the session-forgery key into an `Authorization` header on every
 *   cron invocation.
 * - **A missing `CRON_SECRET` rejects everything**, rather than comparing the
 *   header against the literal string `Bearer undefined`. A cron that 401s is a
 *   visible alert; a cron quietly authenticating with a guessable value is not.
 *
 * Timing-safe comparison is intentionally not used here — see the "Do NOT fix
 * these" section of FIX_BRIEF.md.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}
