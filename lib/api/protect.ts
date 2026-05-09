/**
 * lib/api/protect.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Combined API route protection: rate limiting + CSRF validation.
 *
 * Usage in any API route:
 *   import { protect } from "@/lib/api/protect";
 *
 *   export async function POST(req: NextRequest) {
 *     const blocked = protect(req, { maxRequests: 10 });
 *     if (blocked) return blocked;
 *     // ... handle request
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limiter";
import { csrfProtection } from "@/lib/security/csrf";

interface ProtectOptions {
  /** Max requests per window. Default: 30 */
  maxRequests?: number;
  /** Window in ms. Default: 60_000 (1 minute) */
  windowMs?: number;
  /** Skip CSRF check (for GET-only routes). Default: false */
  skipCsrf?: boolean;
}

/**
 * Combined rate-limit + CSRF guard.
 * Returns a NextResponse (429 or 403) if blocked, or null if allowed.
 */
export function protect(
  request: NextRequest,
  options: ProtectOptions = {}
): NextResponse | null {
  const { maxRequests = 30, windowMs = 60_000, skipCsrf = false } = options;

  // 1. Rate limiting
  const rateLimited = rateLimit(request, { maxRequests, windowMs });
  if (rateLimited) return rateLimited;

  // 2. CSRF protection for state-changing methods
  if (!skipCsrf) {
    const csrfBlocked = csrfProtection(request);
    if (csrfBlocked) return csrfBlocked;
  }

  return null;
}
