/**
 * Rate Limiter — In-memory sliding window with LRU eviction.
 *
 * Works reliably on serverless platforms (Vercel Edge, etc.) within
 * a single instance. For multi-instance production deployments,
 * replace with @upstash/ratelimit + Upstash Redis for distributed
 * rate limiting across all serverless workers.
 *
 * Features:
 * - Sliding window algorithm (accurate per-window counting)
 * - LRU eviction when store exceeds MAX_ENTRIES (prevents memory leaks)
 * - Automatic stale entry cleanup
 * - Retry-After + X-RateLimit-* headers on 429 responses
 *
 * Usage in API route:
 *   import { rateLimit } from "@/lib/security/rate-limiter";
 *
 *   export async function POST(request: NextRequest) {
 *     const limited = rateLimit(request, { maxRequests: 10, windowMs: 60_000 });
 *     if (limited) return limited; // Returns 429 response
 *     // ... handle request
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
  lastAccessed: number;
}

interface RateLimitOptions {
  /** Max requests allowed in the window. Default: 20 */
  maxRequests?: number;
  /** Time window in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
  /** Custom identifier key (default: IP) */
  keyGenerator?: (req: NextRequest) => string;
}

// In-memory store — LRU-evicted to prevent unbounded growth
const store = new Map<string, RateLimitEntry>();

/** Max entries before LRU eviction kicks in */
const MAX_ENTRIES = 10_000;

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }

  // LRU eviction if store is still too large
  if (store.size > MAX_ENTRIES) {
    const entries = [...store.entries()].sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );
    const toRemove = entries.slice(0, store.size - MAX_ENTRIES);
    for (const [key] of toRemove) {
      store.delete(key);
    }
  }
}

/**
 * Get client IP from request headers.
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Check rate limit. Returns a 429 response if exceeded, or null if allowed.
 */
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): NextResponse | null {
  const {
    maxRequests = 20,
    windowMs = 60_000,
    keyGenerator = (req) => getClientIp(req),
  } = options;

  const key = keyGenerator(request);
  const now = Date.now();

  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], lastAccessed: now };
    store.set(key, entry);
  }

  entry.lastAccessed = now;

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const retryAfter = Math.ceil(
      (entry.timestamps[0] + windowMs - now) / 1000
    );

    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil((entry.timestamps[0] + windowMs) / 1000)
          ),
        },
      }
    );
  }

  entry.timestamps.push(now);

  return null; // Allowed
}

/**
 * Get rate limit info for headers (without enforcing).
 */
export function getRateLimitInfo(
  request: NextRequest,
  options: RateLimitOptions = {}
): { remaining: number; limit: number; reset: number } {
  const { maxRequests = 20, windowMs = 60_000 } = options;
  const key = getClientIp(request);
  const now = Date.now();

  const entry = store.get(key);
  if (!entry) {
    return { remaining: maxRequests, limit: maxRequests, reset: 0 };
  }

  const valid = entry.timestamps.filter((t) => now - t < windowMs);
  return {
    remaining: Math.max(0, maxRequests - valid.length),
    limit: maxRequests,
    reset: valid.length > 0 ? Math.ceil((valid[0] + windowMs) / 1000) : 0,
  };
}
