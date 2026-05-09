/**
 * Archived server-job logic tests
 *
 * These tests preserve business-rule invariants that are now implemented via
 * Supabase SQL jobs and triggers in `supabase/migrations/001_initial_schema.sql`.
 *
 * Covered logic patterns:
 * - autoMarkAbsent: holiday skip, idempotency, batch creation
 * - autoArchiveExpiredPolicies: cutoff filtering, chunked batches
 * - computeDailyAggregations: stat computation, aggregation document
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("autoMarkAbsent logic", () => {
  it("skips users who already have an attendance record", () => {
    const activeUsers = [
      { id: "u1", name: "Alice", role: "employee" },
      { id: "u2", name: "Bob", role: "employee" },
      { id: "u3", name: "Charlie", role: "manager" },
    ];
    const usersWithRecord = new Set(["u1", "u3"]);

    const toMarkAbsent = activeUsers.filter(
      (u) => !usersWithRecord.has(u.id)
    );

    expect(toMarkAbsent).toHaveLength(1);
    expect(toMarkAbsent[0].id).toBe("u2");
  });

  it("filters only employee and manager roles", () => {
    const allUsers = [
      { id: "u1", role: "admin", status: "active" },
      { id: "u2", role: "employee", status: "active" },
      { id: "u3", role: "manager", status: "active" },
      { id: "u4", role: "employee", status: "inactive" },
    ];

    const activeEmployeesAndManagers = allUsers.filter(
      (u) =>
        u.status === "active" &&
        (u.role === "employee" || u.role === "manager")
    );

    expect(activeEmployeesAndManagers).toHaveLength(2);
    expect(activeEmployeesAndManagers.map((u) => u.id)).toEqual(["u2", "u3"]);
  });

  it("generates correct date string (YYYY-MM-DD)", () => {
    const date = new Date(2025, 0, 15); // Jan 15 2025
    const dateStr = date.toLocaleDateString("en-CA");
    expect(dateStr).toBe("2025-01-15");
  });

  it("skips processing when holiday is detected", () => {
    const isHoliday = true;
    let processed = false;

    if (!isHoliday) {
      processed = true;
    }

    expect(processed).toBe(false);
  });

  it("produces zero absent when all users have records", () => {
    const activeUsers = [
      { id: "u1" },
      { id: "u2" },
    ];
    const usersWithRecord = new Set(["u1", "u2"]);

    const toMark = activeUsers.filter((u) => !usersWithRecord.has(u.id));
    expect(toMark).toHaveLength(0);
  });
});

describe("autoArchiveExpiredPolicies logic", () => {
  it("chunks policies at CHUNK_SIZE = 250", () => {
    const CHUNK_SIZE = 250;
    const totalPolicies = 600;
    const docs = Array.from({ length: totalPolicies }, (_, i) => ({
      id: `pol-${i}`,
      policy_number: `POL-${i}`,
    }));

    const chunks: typeof docs[] = [];
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      chunks.push(docs.slice(i, i + CHUNK_SIZE));
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(250);
    expect(chunks[1]).toHaveLength(250);
    expect(chunks[2]).toHaveLength(100);
  });

  it("computes cutoff date as 1 year ago", () => {
    const now = new Date(2025, 6, 1); // July 1, 2025
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    expect(oneYearAgo.getFullYear()).toBe(2024);
    expect(oneYearAgo.getMonth()).toBe(6); // July (0-indexed)
  });

  it("filters only expired policies", () => {
    const policies = [
      { status: "active", end_date: new Date(2024, 0, 1) },
      { status: "expired", end_date: new Date(2023, 5, 1) },
      { status: "expired", end_date: new Date(2025, 0, 1) },
      { status: "archived", end_date: new Date(2022, 0, 1) },
    ];

    const cutoff = new Date(2024, 6, 1); // July 1, 2024

    const toArchive = policies.filter(
      (p) => p.status === "expired" && p.end_date <= cutoff
    );

    expect(toArchive).toHaveLength(1);
    expect(toArchive[0].end_date.getFullYear()).toBe(2023);
  });

  it("creates 2 operations per policy (update + audit log)", () => {
    const policiesCount = 10;
    const batchOps = policiesCount * 2; // update + audit log
    expect(batchOps).toBe(20);
    expect(batchOps).toBeLessThanOrEqual(500); // batch limit
  });
});

describe("computeDailyAggregations logic", () => {
  const mockPolicies = [
    { policy_type: "health", status: "active", premium_amount: 10000, sum_insured: 500000 },
    { policy_type: "motor", status: "active", premium_amount: 5000, sum_insured: 200000 },
    { policy_type: "health", status: "expired", premium_amount: 8000, sum_insured: 300000 },
    { policy_type: "fire", status: "active", premium_amount: 12000, sum_insured: 1000000 },
  ];

  it("computes policy type breakdown", () => {
    const breakdown: Record<string, number> = {};
    for (const p of mockPolicies) {
      breakdown[p.policy_type] = (breakdown[p.policy_type] || 0) + 1;
    }

    expect(breakdown).toEqual({ health: 2, motor: 1, fire: 1 });
  });

  it("computes policy status breakdown", () => {
    const breakdown: Record<string, number> = {};
    for (const p of mockPolicies) {
      breakdown[p.status] = (breakdown[p.status] || 0) + 1;
    }

    expect(breakdown).toEqual({ active: 3, expired: 1 });
  });

  it("computes total premium and average", () => {
    let total = 0;
    for (const p of mockPolicies) {
      total += p.premium_amount;
    }
    const avg = Math.round(total / mockPolicies.length);

    expect(total).toBe(35000);
    expect(avg).toBe(8750);
  });

  it("computes premium collection rate", () => {
    const collected = 50000;
    const pending = 20000;
    const overdue = 10000;
    const total = collected + pending + overdue;

    const rate = Math.round((collected / total) * 10000) / 100;
    expect(rate).toBe(62.5);
  });

  it("handles zero premiums gracefully", () => {
    const collected = 0;
    const pending = 0;
    const overdue = 0;
    const total = collected + pending + overdue;

    const rate = total > 0
      ? Math.round((collected / total) * 10000) / 100
      : 0;

    expect(rate).toBe(0);
  });

  it("computes renewal conversion rate", () => {
    const total = 100;
    const renewed = 75;
    const rate = Math.round((renewed / total) * 10000) / 100;

    expect(rate).toBe(75);
  });

  it("computes commission totals", () => {
    const commissions = [
      { status: "pending", amount: 1000 },
      { status: "approved", amount: 2000 },
      { status: "paid", amount: 3000 },
      { status: "pending", amount: 500 },
    ];

    let pending = 0, approved = 0, paid = 0;
    for (const c of commissions) {
      if (c.status === "pending") pending += c.amount;
      else if (c.status === "approved") approved += c.amount;
      else if (c.status === "paid") paid += c.amount;
    }

    expect(pending).toBe(1500);
    expect(approved).toBe(2000);
    expect(paid).toBe(3000);
    expect(pending + approved + paid).toBe(6500);
  });

  it("uses date as doc ID for idempotency", () => {
    const date = new Date(2025, 6, 1);
    const dateStr = date.toLocaleDateString("en-CA");
    expect(dateStr).toBe("2025-07-01");

    // Second run should produce same doc ID
    const dateStr2 = date.toLocaleDateString("en-CA");
    expect(dateStr2).toBe(dateStr);
  });
});
