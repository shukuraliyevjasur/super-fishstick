import { auth, normaliseEmail } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

/**
 * Platform administration — the operator of replie, not a workspace owner.
 *
 * This is deliberately a different axis from `canManageWorkspace`, which is
 * workspace-scoped: every customer is OWNER of their own workspace, so gating
 * anything platform-wide on that role gates it on nothing. D2 in DECISIONS.md
 * calls this out for the plan-granting endpoint (a workspace owner must not be
 * able to grant themselves Pro); the same reasoning applies to any cross-tenant
 * data.
 *
 * Membership comes from the `ADMIN_EMAILS` env var — a comma-separated
 * allowlist — rather than a database column, for three reasons:
 *
 * - It needs no migration, and Prisma migrations on this project carry the
 *   P3009 trap (see HANDOFF.md).
 * - It cannot be escalated by a database write. An attacker with SQL access
 *   still cannot make themselves an admin.
 * - Revoking is an env change, not a data fix.
 *
 * The tradeoff is that changing admins needs a redeploy. For a single-operator
 * product that is the right trade; revisit if staff ever need granting.
 *
 * **The email must also be verified.** Signup refuses an address that already
 * exists, but an address that has *never* registered is claimable by anyone — so
 * without this check, listing an unregistered address in ADMIN_EMAILS would let
 * whoever signs up with it first become the platform admin. Requiring
 * `emailVerified` means they must also receive mail at that address.
 */

export function parseAdminEmails(
  raw: string | undefined = process.env.ADMIN_EMAILS
): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => normaliseEmail(entry))
    .filter(Boolean);
}

/** Allowlist membership only. Does not check that the address is verified. */
export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS
): boolean {
  if (!email) return false;
  const admins = parseAdminEmails(raw);
  // Fails closed: an unset or empty ADMIN_EMAILS grants nobody.
  if (admins.length === 0) return false;
  return admins.includes(normaliseEmail(email));
}

/**
 * Whether the signed-in caller is a platform admin.
 *
 * Reads the email from the database rather than the session token, so a stale
 * JWT cannot carry an address the account no longer has — sessions are not
 * revocable server-side (D1), which makes the token the wrong source of truth
 * for an authorisation decision.
 */
export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true },
  });

  if (!user?.emailVerified) return false;
  return isAdminEmail(user.email);
}
