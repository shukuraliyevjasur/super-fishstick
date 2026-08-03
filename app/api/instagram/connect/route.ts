import { NextResponse } from "next/server";
import { canManageWorkspace, getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { getBaseUrl } from "@/lib/env";
import { createOAuthState, getAuthorizationUrl } from "@/lib/meta/oauth";

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.redirect(`${getBaseUrl()}/login`);
  }
  if (!canManageWorkspace(context.role)) {
    return NextResponse.redirect(`${getBaseUrl()}/settings?instagram=forbidden`);
  }

  const redirectUri = `${getBaseUrl()}/api/instagram/callback`;
  const state = createOAuthState(context.workspaceId);

  const oauthUrl = getAuthorizationUrl(redirectUri, state);

  // A plain 302 to instagram.com is intercepted by iOS universal links and
  // opens the Instagram app, which cannot complete the OAuth flow. A meta-
  // refresh from our own origin is treated as a same-tab navigation by Safari
  // and bypasses that interception.
  return new NextResponse(
    `<!doctype html><html><head>` +
      `<meta http-equiv="refresh" content="0;url=${oauthUrl}">` +
      `<title>Connecting…</title></head>` +
      `<body><a href="${oauthUrl}">Tap here if not redirected</a></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
