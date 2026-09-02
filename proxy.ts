import { NextRequest, NextResponse } from "next/server";

// Every real route this app currently has. Keep this in sync with the
// folders under app/ — add a key here whenever you add a new route folder.
const KNOWN_ROUTES = ["/home", "/analytics", "/staff", "/readme", "/llmsummary"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next internals, API routes, and any file request (favicon.ico,
  // images, etc. — anything with a dot in the last segment) pass through
  // untouched.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // "/" or anything not in KNOWN_ROUTES -> /home
  if (pathname === "/" || !KNOWN_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

// Matcher is a perf/scope optimization — it decides which requests this
// file even runs for. Keep it broad; the checks above do the real filtering.
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};