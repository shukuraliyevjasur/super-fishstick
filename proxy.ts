import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["uz", "ru"] as const;
const DEFAULT_LOCALE = "uz";

const PROTECTED_PATHS = [
  "/dashboard",
  "/campaigns",
  "/automations",
  "/logs",
  "/settings",
  "/inbox",
  "/overview",
  "/diagnostics",
];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token") ||
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token")
  );
}

function getLocale(request: NextRequest): string {
  const accept = request.headers.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("ru")) return "ru";
  // Russian browser: ru-RU, ru;q=0.9, etc.
  if (/\bru\b/.test(accept.toLowerCase())) return "ru";
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
  const isLogin = stripped === "/login";
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
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
