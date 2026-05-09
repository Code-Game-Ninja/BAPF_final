/**
 * Next.js Proxy — Security Headers & Route Protection
 *
 * Runs on the edge before page rendering (Next.js 16 "proxy" convention).
 *
 * - /api/*       → requires Bearer token for protected endpoints (returns 401)
 * - /dashboard/* → security headers only; auth enforced client-side by AuthProvider
 *
 * Full Supabase Bearer token verification happens in API routes via requireAuth().
 * Dashboard auth is handled client-side by AuthProvider + DashboardLayout guard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

// ---- Security Headers ----

// Derive CSP origins from the configured Supabase URL (works for both cloud and self-hosted)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseOrigin = supabaseUrl ? ` ${supabaseUrl.replace(/\/$/, "")}` : "";
const supabaseWs = supabaseUrl
  ? ` ${supabaseUrl.replace(/^http/, "ws").replace(/\/$/, "")}`
  : "";

// In development, allow local Supabase and production domain
const isDev = process.env.NODE_ENV === "development";
const localSupabaseConnect = isDev
  ? " http://localhost http://localhost:8000 ws://localhost ws://localhost:8000 http://192.168.29.126 ws://192.168.29.126 https://app.bpaf.in wss://app.bpaf.in"
  : "";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  // "Strict-Transport-Security":
  //   "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      `img-src 'self' data: blob: https://*.supabase.co${supabaseOrigin}`,
      "media-src 'self' data: blob:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vision.googleapis.com https://*.ingest.sentry.io https://vercel.live${supabaseOrigin}${supabaseWs}${localSupabaseConnect}`,
      `frame-src 'self' https://*.supabase.co blob: https://vercel.live${supabaseOrigin}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
};

// ---- Paths ----

/** Public paths that don't require authentication */
const PUBLIC_PATHS = ["/login", "/api/health"];

/** API paths that handle their own auth in-route — kept for reference.
 *  All /api/* routes now require a Bearer token at the proxy level. */
// const SELF_AUTH_API_PATHS = [
//   "/api/users/create",
//   "/api/search",
//   "/api/vision",
// ];

// ---- Helpers ----

/**
 * Extract Bearer token from the request.
 * Checks Authorization header first, then Supabase auth cookie.
 */
function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Supabase stores auth in cookies prefixed with "sb-<project>-auth-token"
  for (const [name, cookie] of request.cookies.getAll().map(c => [c.name, c] as const)) {
    if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
      return cookie.value;
    }
  }

  return null;
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ---- Proxy (Next.js 16 convention) ----

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Root redirect ----
  // If logged-in cookie exists, go to dashboard; otherwise go to login.
  // Login page also has a client-side check that redirects authenticated users.
  if (pathname === "/") {
    const token = getToken(request);
    const dest = token ? "/dashboard" : "/login";
    return applySecurityHeaders(
      NextResponse.redirect(new URL(dest, request.url))
    );
  }

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ---- Refresh Supabase session (keeps auth cookies alive) ----
  let supabaseResponse = NextResponse.next({ request });
  const token = getToken(request);

  // Skip getUser() for static-like paths or if no token exists (unless it's the root)
  const shouldVerify = pathname === "/" || (token && !pathname.startsWith("/dashboard") && !pathname.startsWith("/api/"));

  if (shouldVerify) {
    try {
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              supabaseResponse = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, { ...options, secure: false })
              );
            },
          },
        }
      );
      await supabase.auth.getUser();
    } catch {
      // Non-fatal — continue even if session refresh fails
    }
  }

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return applySecurityHeaders(supabaseResponse);
  }

  // ---- All API routes require a Bearer token (catch-all) ----
  if (pathname.startsWith("/api/")) {
    const token = getToken(request);
    if (!token) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Unauthorized — Bearer token required" },
          { status: 401 }
        )
      );
    }
    return applySecurityHeaders(supabaseResponse);
  }

  // ---- Dashboard pages ----
  // Auth is enforced client-side by AuthProvider + DashboardLayout guard.
  // No server-side cookie check — avoids redirect loops when cookie is
  // not yet available after login.
  if (pathname.startsWith("/dashboard")) {
    return applySecurityHeaders(supabaseResponse);
  }

  // ---- All other routes: just apply headers ----
  return applySecurityHeaders(supabaseResponse);
}

// ---- Matcher ----

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
