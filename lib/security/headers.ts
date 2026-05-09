/**
 * Security Headers & IP Restriction
 *
 * Provides security headers middleware and IP restriction for API routes.
 * CORS helpers removed — app is same-origin (Next.js serves both UI and API).
 */

import { NextRequest, NextResponse } from "next/server";

// ---- Security Headers ----

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security":
    "max-age=31536000; includeSubDomains; preload",
};

/**
 * Apply security headers to a response.
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ---- IP Restriction ----

/**
 * Check if the request IP is in the whitelist.
 * Reads from OFFICE_IP_WHITELIST env var (comma-separated).
 * Returns null if no whitelist configured or IP is allowed.
 * Returns a 403 response if IP is blocked.
 */
export function checkIpRestriction(
  request: NextRequest
): NextResponse | null {
  const whitelist = process.env.OFFICE_IP_WHITELIST;
  if (!whitelist) return null; // No restriction configured

  const allowedIps = whitelist
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (allowedIps.length === 0) return null;

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Allow localhost always
  if (
    clientIp === "127.0.0.1" ||
    clientIp === "::1" ||
    clientIp === "localhost"
  ) {
    return null;
  }

  if (!allowedIps.includes(clientIp)) {
    return NextResponse.json(
      { error: "Access denied. IP not authorized." },
      { status: 403 }
    );
  }

  return null;
}
