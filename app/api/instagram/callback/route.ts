import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getBaseUrl } from "@/lib/env";
import { canConnectInstagramAccount } from "@/lib/instagram-accounts";
import {
  MetaApiError,
  getLongLivedToken,
  getUserInfo,
  subscribeInstagramAccountToWebhooks,
} from "@/lib/meta/client";
import {
  encryptToken,
  exchangeCodeForToken,
  verifyOAuthState,
} from "@/lib/meta/oauth";
import { canManageWorkspace } from "@/lib/workspace-access";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = verifyOAuthState(request.nextUrl.searchParams.get("state"));
  const baseUrl = getBaseUrl();

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?instagram=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?instagram=invalid`);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: state.workspaceId,
      userId: session.user.id,
    },
  });

  if (!membership || !canManageWorkspace(membership.role)) {
    return NextResponse.redirect(`${baseUrl}/settings?instagram=forbidden`);
  }

  // Named so a failure says which Meta call broke. Without this the log was a
  // bare code-100 that could have come from any of three requests.
  let step = "exchange_code";
  let grantedPermissions = "";

  try {
    const redirectUri = `${baseUrl}/api/instagram/callback`;
    const {
      accessToken: shortLivedToken,
      permissions,
    } = await exchangeCodeForToken(code, redirectUri);
    grantedPermissions = permissions;

    step = "long_lived_token";
    // Meta rejects the exchange for this app's tokens with code 100
    // "Unsupported request" on every documented form — unversioned and
    // versioned, GET and POST — while a fake token still gets the normal 190
    // from the OAuth layer. The endpoint exists; the edge is just not offered
    // for these tokens, which is what you would expect if the token returned
    // by Business Login does not need exchanging.
    //
    // So this is no longer fatal: an account that cannot be connected at all
    // is strictly worse than one holding the token Meta actually issued. Only
    // "unsupported" is tolerated — a rejected or expired token (190) still
    // fails loudly, because that is a real auth problem.
    let longLivedToken = shortLivedToken;
    let expiresIn = 3600; // documented short-lived lifetime, until proven otherwise
    try {
      const exchanged = await getLongLivedToken(shortLivedToken);
      longLivedToken = exchanged.accessToken;
      expiresIn = exchanged.expiresIn;
    } catch (exchangeError) {
      const unsupported =
        exchangeError instanceof MetaApiError && exchangeError.code === 100;
      if (!unsupported) throw exchangeError;

      console.warn(
        "[Instagram Callback] long-lived exchange unavailable (code 100) — " +
          "continuing with the token from the code exchange. If this account " +
          "keeps working past an hour, that token was already long-lived and " +
          "the exchange step can be dropped."
      );
    }

    step = "get_user_info";
    const userInfo = await getUserInfo(longLivedToken);

    step = "persist";
    // Webhooks and the messaging API key off the professional account ID
    // (user_id), not the app-scoped `id`. Store user_id so comment webhooks
    // can be matched back to this account. Fall back to id if user_id is
    // ever absent.
    const instagramId = userInfo.user_id ?? userInfo.id;
    const connection = await canConnectInstagramAccount({
      workspaceId: state.workspaceId,
      instagramId,
    });

    if (!connection.allowed) {
      return NextResponse.redirect(
        `${baseUrl}/settings?instagram=already_connected`
      );
    }

    const encryptedToken = encryptToken(longLivedToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    let webhookSubscribed = false;
    try {
      const subscription = await subscribeInstagramAccountToWebhooks(
        instagramId,
        longLivedToken
      );
      webhookSubscribed = Boolean(subscription.success);
    } catch (subscriptionError) {
      console.warn(
        "[Instagram Callback] Webhook subscription failed:",
        subscriptionError
      );
    }

    await prisma.instagramAccount.upsert({
      where: { instagramId },
      create: {
        workspaceId: state.workspaceId,
        instagramId,
        username: userInfo.username,
        name: userInfo.name,
        accessToken: encryptedToken,
        tokenExpiresAt,
        webhookSubscribed,
      },
      update: {
        workspaceId: state.workspaceId,
        username: userInfo.username,
        name: userInfo.name,
        accessToken: encryptedToken,
        tokenExpiresAt,
        webhookSubscribed,
      },
    });

    return NextResponse.redirect(`${baseUrl}/dashboard?connected=true`);
  } catch (err) {
    console.error(
      `[Instagram Callback] Failed at step "${step}" (granted scopes: ${
        grantedPermissions || "<none reported>"
      }):`,
      err
    );
    return NextResponse.redirect(
      `${baseUrl}/settings?instagram=failed&step=${step}`
    );
  }
}
