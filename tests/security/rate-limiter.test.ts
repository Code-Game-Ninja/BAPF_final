/**
 * Tests for lib/security/rate-limiter.ts
 */
import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, getRateLimitInfo } from "@/lib/security/rate-limiter";
import { NextRequest } from "next/server";

function makeReq(ip = "1.2.3.4") {
  return new NextRequest("http://localhost:3000/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimit", () => {
  // Use unique IPs per test to avoid store pollution
  let testIp: string;
  beforeEach(() => {
    testIp = `10.0.0.${Math.floor(Math.random() * 255)}`;
  });

  it("allows requests under the limit", () => {
    const result = rateLimit(makeReq(testIp), { maxRequests: 5, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it("returns 429 when limit is exceeded", () => {
    const opts = { maxRequests: 3, windowMs: 60_000 };
    const ip = `limit-test-${Date.now()}`;

    rateLimit(makeReq(ip), opts);
    rateLimit(makeReq(ip), opts);
    rateLimit(makeReq(ip), opts);

    const result = rateLimit(makeReq(ip), opts);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("includes Retry-After header in 429 response", async () => {
    const opts = { maxRequests: 1, windowMs: 60_000 };
    const ip = `header-test-${Date.now()}`;

    rateLimit(makeReq(ip), opts);
    const result = rateLimit(makeReq(ip), opts);
    expect(result).not.toBeNull();
    expect(result!.headers.get("Retry-After")).toBeTruthy();
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("allows different IPs independently", () => {
    const opts = { maxRequests: 1, windowMs: 60_000 };
    const ip1 = `ind-test1-${Date.now()}`;
    const ip2 = `ind-test2-${Date.now()}`;

    rateLimit(makeReq(ip1), opts);
    const r1 = rateLimit(makeReq(ip1), opts); // should be blocked
    const r2 = rateLimit(makeReq(ip2), opts); // should be allowed

    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });
});

describe("getRateLimitInfo", () => {
  it("returns full remaining for unknown IP", () => {
    const info = getRateLimitInfo(makeReq(`unknown-${Date.now()}`), { maxRequests: 10 });
    expect(info.remaining).toBe(10);
    expect(info.limit).toBe(10);
  });

  it("decrements remaining after requests", () => {
    const opts = { maxRequests: 5, windowMs: 60_000 };
    const ip = `info-test-${Date.now()}`;

    rateLimit(makeReq(ip), opts);
    rateLimit(makeReq(ip), opts);

    const info = getRateLimitInfo(makeReq(ip), opts);
    expect(info.remaining).toBe(3);
  });
});
