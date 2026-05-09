/**
 * CSRF Protection for state-changing API endpoints.
 *
 * Uses Origin/Referer header validation (recommended for REST APIs).
 * This is simpler and more reliable than token-based CSRF for APIs
 * that use Authorization headers (which are not sent by form attacks).
 *
 * For extra defense-in-depth, we also verify the request origin matches
 * our allowed hosts.
 */

import { NextRequest, NextResponse } from "next/server";

/** Hosts allowed to make state-changing requests */
const ALLOWED_HOSTS = new Set<string>(
  [
    "localhost:3000",
    "localhost:3001",
    // User-defined canonical URL (highest priority — set this in Vercel env vars)
    process.env.NEXT_PUBLIC_APP_URL
      ? (() => {
          try {
            const url = process.env.NEXT_PUBLIC_APP_URL.includes("://")
              ? new URL(process.env.NEXT_PUBLIC_APP_URL)
              : new URL(`https://${process.env.NEXT_PUBLIC_APP_URL}`);
            return url.host;
          } catch {
            return process.env.NEXT_PUBLIC_APP_URL;
          }
        })()
      : null,
    // Vercel system env vars (automatically injected at build/runtime)
    // VERCEL_URL          = unique URL for this specific deployment (may vary per deploy)
    // VERCEL_PROJECT_PRODUCTION_URL = stable production domain (e.g. bapf.vercel.app)
    // VERCEL_BRANCH_URL   = stable URL for the current branch
    process.env.VERCEL_URL || null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
    process.env.VERCEL_BRANCH_URL || null,
  ].filter(Boolean) as string[]
);

/**
 * Validate CSRF for state-changing requests (POST, PUT, PATCH, DELETE).
 *
 * Returns null if the request is safe, or a 403 NextResponse if blocked.
 *
 * Safe requests (GET, HEAD, OPTIONS) are always allowed.
 * Requests with a valid Authorization header are lower risk
 * (Bearer tokens can't be sent by HTML forms), but we still
 * validate origin for defense-in-depth.
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Safe methods don't need CSRF protection
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  // Check Origin header first (most reliable)
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "unknown";
    try {
      originHost = new URL(origin).host;
      if (ALLOWED_HOSTS.has(originHost)) {
        return null; // Allowed origin
      }
    } catch {
      // Malformed origin — fall through to reject
    }

    return NextResponse.json(
      { error: `Forbidden — invalid request origin: ${originHost}` },
      { status: 403 }
    );
  }

  // If no Origin, check Referer (backup — some browsers strip Origin on same-site)
  const referer = request.headers.get("referer");
  if (referer) {
    let refererHost = "unknown";
    try {
      refererHost = new URL(referer).host;
      if (ALLOWED_HOSTS.has(refererHost)) {
        return null; // Allowed referer
      }
    } catch {
      // Malformed referer — fall through to reject
    }

    return NextResponse.json(
      { error: `Forbidden — invalid request origin (via referer): ${refererHost}` },
      { status: 403 }
    );
  }

  // No Origin or Referer — only allow if request has Authorization header
  // (Bearer tokens cannot be attached by HTML form attacks)
  const hasAuth = request.headers.has("authorization");
  if (hasAuth) {
    return null;
  }

  // No origin, no referer, no auth — reject
  return NextResponse.json(
    { error: "Forbidden — request origin could not be verified" },
    { status: 403 }
  );
}
