import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { subscribeInstagramAccountToWebhooks } from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";
import { getMetaGraphApiVersion } from "@/lib/env";

export const runtime = "nodejs";

// Check subscribed fields + token scopes for all connected accounts.
export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId },
    select: { instagramId: true, username: true, accessToken: true },
  });

  const base = `https://graph.instagram.com/${getMetaGraphApiVersion()}`;
  const appId = process.env.INSTAGRAM_APP_ID;
  // debug_token goes to graph.facebook.com — needs the Facebook app secret,
  // not the Instagram one (they differ when both are set).
  const appSecret = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET;

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const token = decryptToken(account.accessToken);

      const [subsRes, debugRes] = await Promise.all([
        fetch(`${base}/${account.instagramId}/subscribed_apps`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        appId && appSecret
          ? fetch(
              `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
            )
          : null,
      ]);

      const subsData = await subsRes.json();
      const debugData = debugRes ? await debugRes.json() : null;

      return {
        username: account.username,
        subscribed_fields: subsData?.data?.[0]?.subscribed_fields ?? subsData,
        token_scopes: debugData?.data?.scopes ?? debugData?.error ?? "no app credentials",
        token_expires_at: debugData?.data?.expires_at ?? null,
        token_is_valid: debugData?.data?.is_valid ?? null,
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: results.map((r) =>
      r.status === "fulfilled" ? r.value : { username: "unknown", error: String(r.reason) }
    ),
  });
}

export async function POST() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId },
    select: { id: true, instagramId: true, username: true, accessToken: true },
  });

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const token = decryptToken(account.accessToken);
      const result = await subscribeInstagramAccountToWebhooks(
        account.instagramId,
        token
      );
      if (result.success) {
        await prisma.instagramAccount.update({
          where: { id: account.id },
          data: { webhookSubscribed: true },
        });
      }
      return { username: account.username, success: result.success };
    })
  );

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { username: "unknown", success: false }
  );

  return NextResponse.json({ success: true, data: summary });
}
