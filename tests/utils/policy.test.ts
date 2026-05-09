/**
 * Tests for lib/utils/policy.ts
 */
import { describe, it, expect, vi } from "vitest";
import {
  getDaysUntilExpiry,
  getPolicyExpiryBucket,
  getISOWeekNumber,
  getISOWeekRange,
  EXPIRY_BUCKETS,
} from "@/lib/helpers/policy";

describe("getDaysUntilExpiry", () => {
  it("returns negative for past dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getDaysUntilExpiry(past)).toBeLessThan(0);
  });

  it("returns positive for future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(getDaysUntilExpiry(future)).toBeGreaterThan(0);
  });

  it("returns 0 for today", () => {
    const today = new Date();
    const days = getDaysUntilExpiry(today);
    expect(days).toBeGreaterThanOrEqual(-1);
    expect(days).toBeLessThanOrEqual(1);
  });

  it("handles ISO string input", () => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    const days = getDaysUntilExpiry(future.toISOString());
    expect(days).toBeGreaterThan(10);
    expect(days).toBeLessThan(20);
  });
});

describe("getPolicyExpiryBucket", () => {
  it("returns 'expired' for past dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getPolicyExpiryBucket(past)).toBe("expired");
  });

  it("returns 'next7days' for dates within 7 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    expect(getPolicyExpiryBucket(soon)).toBe("next7days");
  });

  it("returns 'next30days' for dates within 8-30 days", () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    expect(getPolicyExpiryBucket(d)).toBe("next30days");
  });

  it("returns 'next90days' for dates within 31-90 days", () => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    expect(getPolicyExpiryBucket(d)).toBe("next90days");
  });

  it("returns 'beyond90days' for dates > 90 days", () => {
    const d = new Date();
    d.setDate(d.getDate() + 120);
    expect(getPolicyExpiryBucket(d)).toBe("beyond90days");
  });
});

describe("getISOWeekNumber", () => {
  it("returns week 1 for early January", () => {
    // Jan 1, 2026 is a Thursday — ISO week 1
    const week = getISOWeekNumber(new Date(2026, 0, 1));
    expect(week).toBe(1);
  });

  it("returns correct week for known date", () => {
    // Feb 16, 2026 is a Monday — ISO week 8
    const week = getISOWeekNumber(new Date(2026, 1, 16));
    expect(week).toBeGreaterThan(0);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe("getISOWeekRange", () => {
  it("returns start and end dates for a week", () => {
    const { start, end } = getISOWeekRange(2026, 1);
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    // 7 day range
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(6, 0);
  });
});

describe("EXPIRY_BUCKETS", () => {
  it("has 5 bucket definitions", () => {
    expect(EXPIRY_BUCKETS).toHaveLength(5);
  });

  it("includes all expected keys", () => {
    const keys = EXPIRY_BUCKETS.map((b) => b.key);
    expect(keys).toContain("expired");
    expect(keys).toContain("next7days");
    expect(keys).toContain("next30days");
    expect(keys).toContain("next90days");
    expect(keys).toContain("beyond90days");
  });
});
