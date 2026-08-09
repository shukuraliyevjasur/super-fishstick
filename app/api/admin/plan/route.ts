import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isCurrentUserPlatformAdmin } from "@/lib/auth/admin";
import {
  WorkspaceNotFoundError,
  grantWorkspacePlan,
} from "@/lib/billing/grant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Grants a paid plan to a workspace (P1 / D2).
 *
 * Payment is collected manually for now — the customer contacts `t.me/ceo_syr`,
 * the owner confirms, the owner grants the plan here. Payment rails follow and
 * then become the normal path; this route stays for support and refunds.
 *
 * **Gated on platform admin, deliberately not `canManageWorkspace`.** That check
 * is workspace-scoped and every customer is OWNER of their own workspace, so
 * using it here would let anyone grant themselves Pro. See D3 in DECISIONS.md.
 *
 * The route is intentionally thin: all the logic is in `grantWorkspacePlan()` so
 * the payment webhook can call the same function unchanged.
 */

const grantSchema = z.object({
  workspaceId: z.string().min(1),
  plan: z.enum(["FREE", "STANDART", "PRO", "AGENCY"]),
  /** ISO 8601. Omitted or null means the plan does not expire. */
  expiresAt: z.string().datetime().optional().nullable(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const actorId = session?.user?.id;

  if (!actorId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!(await isCurrentUserPlatformAdmin())) {
    // 403, not 404: the caller is authenticated and simply not permitted.
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : null;

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    // A grant that is already expired is almost certainly a typo in the date,
    // and it would silently do nothing useful.
    return NextResponse.json(
      { success: false, error: "expiresAt must be in the future" },
      { status: 400 }
    );
  }

  try {
    const result = await grantWorkspacePlan({
      workspaceId: parsed.data.workspaceId,
      plan: parsed.data.plan,
      grantedBy: actorId,
      expiresAt,
      reason: parsed.data.reason,
      source: "ADMIN",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }
    throw error;
  }
}
