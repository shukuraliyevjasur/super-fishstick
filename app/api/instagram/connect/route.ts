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

  // A 302 to instagram.com is intercepted by iOS universal links and opens
  // the Instagram app, which cannot complete OAuth. Opening the URL via
  // target="_blank" from a user tap is treated as an explicit new-tab action
  // by Safari and bypasses universal link interception.
  const esc = oauthUrl.replace(/"/g, "&quot;");
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Instagram verbinding…</title>` +
      `<style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;` +
      `align-items:center;justify-content:center;min-height:100vh;margin:0;background:#000;color:#fff}` +
      `a{display:inline-block;margin-top:1.5rem;padding:.875rem 2rem;background:#fff;color:#000;` +
      `border-radius:9999px;font-weight:600;text-decoration:none;font-size:1rem}</style></head>` +
      `<body><p>Instagram bilan ulaning</p>` +
      `<a href="${esc}" target="_blank" rel="noopener noreferrer">Instagram'ga o'tish</a>` +
      `</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
