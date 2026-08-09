import { NextResponse, type NextRequest } from "next/server";
// Shared with app/robots.ts so a new protected page cannot stay advertised to
// crawlers. lib/site.ts is pure — no server-only import — so it is safe here.
import { PROTECTED_PATHS } from "@/lib/site";

const LOCALES = ["uz", "ru", "en"] as const;
const DEFAULT_LOCALE = "uz";

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token") ||
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token")
  );
}

function getLocale(request: NextRequest): string {
  // `?? "".toLowerCase()` lowercased the empty fallback, not the header, so the
  // matches below ran case-sensitively against the raw value. Browsers send
  // lowercase subtags so it usually worked, but `Accept-Language: RU-RU` fell
  // through to Uzbek.
  const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
  if (/\bru\b/.test(accept)) return "ru";
  if (/\ben\b/.test(accept)) return "en";
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Detect if pathname already has a supported locale prefix
  const pathnameLocale = LOCALES.find(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (!pathnameLocale) {
    // Redirect to locale-prefixed path
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  // Strip locale prefix to get the canonical path
  const stripped = pathname.slice(pathnameLocale.length); // e.g. "/dashboard"

  const isProtected = PROTECTED_PATHS.some(
    (p) => stripped === p || stripped.startsWith(`${p}/`)
  );
  // Both entry screens are pointless once signed in.
  const isLogin = stripped === "/login" || stripped === "/signup";
  const isAuthenticated = hasSessionCookie(request);

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL(`/${pathnameLocale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && isAuthenticated) {
    return NextResponse.redirect(
      new URL(`/${pathnameLocale}/dashboard`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - /api/* (API routes, no locale needed)
     *
     * The rest are locale-less by design and have no page under app/[lang],
     * so prefixing them produced a 404:
     * - /r/* tracked-link redirects. This URL is baked into every DM already
     *   sent (lib/tracking/message.ts builds `${APP_URL}/r/<slug>`), so it can
     *   never carry a locale — and a 404 here loses the click and strands the
     *   recipient.
     * - /reports/* public client-report share links, handed to third parties.
     * - /miniapp/* Telegram Mini App report pages (T12).
     * - robots.txt and sitemap.xml, which crawlers fetch at the domain root.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|r/|reports/|miniapp/|robots\\.txt|sitemap\\.xml).*)",
  ],
};
