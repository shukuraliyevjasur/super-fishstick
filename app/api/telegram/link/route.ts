import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createLinkCode, getLinkForUser, LINK_CODE_PREFIX } from "@/lib/telegram/link";
import { buildTelegramDeepLink } from "@/lib/telegram/deep-link";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { getOwnBotStatus } from "@/lib/telegram/own-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether this user's Telegram is already bound (D4). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const link = await getLinkForUser(session.user.id);

  return NextResponse.json({
    success: true,
    linked: Boolean(link),
    linkedAt: link?.linkedAt ?? null,
  });
}

/**
 * Mint a fresh link code and return the deep link that redeems it.
 *
 * POST rather than GET because it invalidates any previous code — minting is a
 * state change, and a prefetch must not silently break a link the user is
 * looking at.
 */
export async function POST() {
  const [session, context] = await Promise.all([auth(), getCurrentWorkspaceContext()]);
  if (!session?.user?.id || !context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const ownBot = await getOwnBotStatus(context.workspaceId);
  if (!ownBot.configured || !ownBot.botUsername) {
    return NextResponse.json(
      { success: false, error: "Own Telegram bot is not configured" },
      { status: 409 }
    );
  }

  const code = await createLinkCode(session.user.id);
  const url = buildTelegramDeepLink(`${LINK_CODE_PREFIX}${code}`, ownBot.botUsername);

  if (!url) {
    return NextResponse.json(
      { success: false, error: "Telegram bot is not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, url });
}
