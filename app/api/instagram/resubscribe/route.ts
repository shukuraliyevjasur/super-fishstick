import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { subscribeInstagramAccountToWebhooks } from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";
import { getMetaGraphApiVersion } from "@/lib/env";

export const runtime = "nodejs";

// Check what fields are actually subscribed at the account level via Meta's API.
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

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const token = decryptToken(account.accessToken);
      const res = await fetch(`${base}/${account.instagramId}/subscribed_apps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return { username: account.username, data };
    })
  );

  return NextResponse.json({
    success: true,
    data: results.map((r) =>
      r.status === "fulfilled" ? r.value : { username: "unknown", error: r.reason }
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
