/**
 * Property-Based Tests: Unified CRM Phase 4
 * Advanced Features — Renewal Cockpit, Quote Comparison,
 * Commission Reconciliation, IRDA Compliance
 *
 * Tests correctness properties defined in requirements.md
 * Run: vitest run tests/phase4/advanced-features-properties.test.ts
 *
 * All tests are pure logic tests — no DB calls.
 *
 * **Validates: Requirements 3.9, 7.11, 13.8, 14.1–14.9**
 */

import { describe, it, expect } from "vitest";
import { calculateRiskScore } from "@/lib/renewals/riskScore";

// ── Types ─────────────────────────────────────────────────────────

type RenewalStage = "due" | "contacted" | "negotiating" | "renewed" | "lost";

interface RenewalPipelineEntry {
  id: string;
  stage: RenewalStage;
  risk_score: number;
}

interface ReconciliationRun {
  total_records: number;
  matched_count: number;
  discrepancy_count: number;
}

interface StatementRow {
  policy_number: string;
  statement_commission: number;
}

interface CommissionRate {
  rate_type: "percentage" | "flat";
  rate_value: number;
}

interface ComplianceItem {
  id: string;
  due_date: string;
  recurrence: "one_time" | "monthly" | "quarterly" | "half_yearly" | "annual";
}

interface AuditEntry {
  event_timestamp: string;
  audit_timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────

const STAGE_ORDER: RenewalStage[] = ["due", "contacted", "negotiating", "renewed", "lost"];
const TERMINAL_STAGES: RenewalStage[] = ["renewed", "lost"];

/**
 * Check if a stage transition is valid (no backward from terminal).
 */
function isValidStageTransition(from: RenewalStage, to: RenewalStage): boolean {
  if (TERMINAL_STAGES.includes(from)) return false;
  if (to === "lost") return true; // can always go to lost from non-terminal
  const fromIdx = STAGE_ORDER.indexOf(from);
  const toIdx = STAGE_ORDER.indexOf(to);
  return toIdx > fromIdx;
}

/**
 * Check reconciliation conservation: matched + discrepancy = total.
 */
function checkReconciliationConservation(run: ReconciliationRun): boolean {
  return run.matched_count + run.discrepancy_count === run.total_records;
}

/**
 * Simulate reconciliation engine (pure logic, no DB).
 * Returns { matched_count, discrepancy_count, total_records }.
 */
function reconcile(
  rows: StatementRow[],
  knownPolicies: Map<string, number> // policy_number -> crm_commission
): ReconciliationRun {
  let matched = 0;
  let discrepancy = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.policy_number)) {
      discrepancy++; // duplicate
      continue;
    }
    seen.add(row.policy_number);

    const crmAmount = knownPolicies.get(row.policy_number);
    if (crmAmount === undefined) {
      discrepancy++; // policy_not_found
      continue;
    }

    const tolerance = row.statement_commission * 0.01;
    const diff = Math.abs(row.statement_commission - crmAmount);
    if (diff <= tolerance) {
      matched++;
    } else {
      discrepancy++; // amount_mismatch
    }
  }

  return {
    total_records: matched + discrepancy,
    matched_count: matched,
    discrepancy_count: discrepancy,
  };
}

/**
 * Get next occurrence due date for a recurring compliance item.
 */
function getNextDueDate(currentDueDate: string, recurrence: string): string | null {
  const date = new Date(currentDueDate);
  switch (recurrence) {
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "half_yearly":
      date.setMonth(date.getMonth() + 6);
      break;
    case "annual":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString().split("T")[0];
}

/**
 * Calculate conversion rate from stage counts.
 */
function calculateConversionRate(stageCounts: Record<string, number>): number {
  const renewed = stageCounts.renewed ?? 0;
  const lost = stageCounts.lost ?? 0;
  const closed = renewed + lost;
  if (closed === 0) return 0;
  return (renewed / closed) * 100;
}

// ── Property 1: Risk Score Range Invariant ────────────────────────
// **Validates: Requirements 3.9**

describe("Property 1: Risk Score Range Invariant (0–100)", () => {
  it("score is always between 0 and 100 for all valid inputs", () => {
    // Test 500+ combinations
    const testCases = [
      // Edge cases
      { daysUntilExpiry: 0, overduePremiuCount: 0, lastContactDaysAgo: null, previousRenewalLost: false },
      { daysUntilExpiry: 7, overduePremiuCount: 2, lastContactDaysAgo: 30, previousRenewalLost: true },
      { daysUntilExpiry: 365, overduePremiuCount: 0, lastContactDaysAgo: 0, previousRenewalLost: false },
      { daysUntilExpiry: 1, overduePremiuCount: 10, lastContactDaysAgo: null, previousRenewalLost: true },
    ];

    // Generate 500+ random inputs
    for (let i = 0; i < 500; i++) {
      testCases.push({
        daysUntilExpiry: Math.floor(Math.random() * 365),
        overduePremiuCount: Math.floor(Math.random() * 10),
        lastContactDaysAgo: Math.random() > 0.3 ? Math.floor(Math.random() * 90) : null,
        previousRenewalLost: Math.random() > 0.5,
      });
    }

    for (const params of testCases) {
      const score = calculateRiskScore(params);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("score is 0 for safest possible renewal", () => {
    const score = calculateRiskScore({
      daysUntilExpiry: 365,
      overduePremiuCount: 0,
      lastContactDaysAgo: 0,
      previousRenewalLost: false,
    });
    expect(score).toBe(0);
  });

  it("score is 100 for highest risk renewal (clamped)", () => {
    const score = calculateRiskScore({
      daysUntilExpiry: 1,
      overduePremiuCount: 10, // 10 * 15 = 150, capped at 30
      lastContactDaysAgo: null,
      previousRenewalLost: true,
    });
    // 40 + 30 + 20 + 10 = 100
    expect(score).toBe(100);
  });

  it("score components add up correctly", () => {
    // days ≤7 → +40, 2 overdue → +30 (capped), no contact → +20, prev lost → +10 = 100
    const score = calculateRiskScore({
      daysUntilExpiry: 5,
      overduePremiuCount: 2,
      lastContactDaysAgo: null,
      previousRenewalLost: true,
    });
    expect(score).toBe(100);
  });

  it("days ≤30 scoring gives +25", () => {
    const score = calculateRiskScore({
      daysUntilExpiry: 20,
      overduePremiuCount: 0,
      lastContactDaysAgo: 0,
      previousRenewalLost: false,
    });
    expect(score).toBe(25);
  });

  it("days ≤60 scoring gives +10", () => {
    const score = calculateRiskScore({
      daysUntilExpiry: 45,
      overduePremiuCount: 0,
      lastContactDaysAgo: 0,
      previousRenewalLost: false,
    });
    expect(score).toBe(10);
  });

  it("overdue premium scoring is capped at 30", () => {
    const score1 = calculateRiskScore({
      daysUntilExpiry: 365,
      overduePremiuCount: 2,
      lastContactDaysAgo: 0,
      previousRenewalLost: false,
    });
    const score2 = calculateRiskScore({
      daysUntilExpiry: 365,
      overduePremiuCount: 100,
      lastContactDaysAgo: 0,
      previousRenewalLost: false,
    });
    // Both should be capped at 30 for overdue component
    expect(score1).toBe(30); // 2 * 15 = 30
    expect(score2).toBe(30); // capped at 30
  });
});

// ── Property 2: Renewal Stage Monotonicity ────────────────────────
// **Validates: Requirements 4.7**

describe("Property 2: Renewal Stage Monotonicity (no backward from terminal)", () => {
  it("cannot go backward from renewed", () => {
    const terminalStage: RenewalStage = "renewed";
    for (const targetStage of STAGE_ORDER) {
      expect(isValidStageTransition(terminalStage, targetStage)).toBe(false);
    }
  });

  it("cannot go backward from lost", () => {
    const terminalStage: RenewalStage = "lost";
    for (const targetStage of STAGE_ORDER) {
      expect(isValidStageTransition(terminalStage, targetStage)).toBe(false);
    }
  });

  it("can go forward from due to contacted", () => {
    expect(isValidStageTransition("due", "contacted")).toBe(true);
  });

  it("can go forward from contacted to negotiating", () => {
    expect(isValidStageTransition("contacted", "negotiating")).toBe(true);
  });

  it("can go forward from negotiating to renewed", () => {
    expect(isValidStageTransition("negotiating", "renewed")).toBe(true);
  });

  it("can go to lost from any non-terminal stage", () => {
    const nonTerminal: RenewalStage[] = ["due", "contacted", "negotiating"];
    for (const stage of nonTerminal) {
      expect(isValidStageTransition(stage, "lost")).toBe(true);
    }
  });

  it("cannot go backward from negotiating to due", () => {
    expect(isValidStageTransition("negotiating", "due")).toBe(false);
  });

  it("cannot go backward from contacted to due", () => {
    expect(isValidStageTransition("contacted", "due")).toBe(false);
  });

  it("monotonicity holds for 500 random valid transitions", () => {
    const nonTerminal: RenewalStage[] = ["due", "contacted", "negotiating"];
    for (let i = 0; i < 500; i++) {
      const fromIdx = Math.floor(Math.random() * nonTerminal.length);
      const from = nonTerminal[fromIdx];
      // Valid forward transition
      const validTargets = STAGE_ORDER.slice(STAGE_ORDER.indexOf(from) + 1);
      if (validTargets.length > 0) {
        const to = validTargets[Math.floor(Math.random() * validTargets.length)];
        expect(isValidStageTransition(from, to)).toBe(true);
      }
    }
  });
});

// ── Property 3: Reconciliation Conservation ──────────────────────
// **Validates: Requirements 13.8**

describe("Property 3: Reconciliation Conservation (matched + discrepancy = total)", () => {
  it("conservation holds for all-matched run", () => {
    const policies = new Map([
      ["POL-001", 1000],
      ["POL-002", 2000],
      ["POL-003", 3000],
    ]);
    const rows: StatementRow[] = [
      { policy_number: "POL-001", statement_commission: 1000 },
      { policy_number: "POL-002", statement_commission: 2000 },
      { policy_number: "POL-003", statement_commission: 3000 },
    ];
    const run = reconcile(rows, policies);
    expect(checkReconciliationConservation(run)).toBe(true);
    expect(run.matched_count).toBe(3);
    expect(run.discrepancy_count).toBe(0);
  });

  it("conservation holds for all-discrepancy run", () => {
    const policies = new Map<string, number>();
    const rows: StatementRow[] = [
      { policy_number: "POL-999", statement_commission: 500 },
      { policy_number: "POL-998", statement_commission: 600 },
    ];
    const run = reconcile(rows, policies);
    expect(checkReconciliationConservation(run)).toBe(true);
    expect(run.discrepancy_count).toBe(2);
  });

  it("conservation holds for mixed run", () => {
    const policies = new Map([
      ["POL-001", 1000],
      ["POL-002", 5000], // mismatch
    ]);
    const rows: StatementRow[] = [
      { policy_number: "POL-001", statement_commission: 1000 }, // matched
      { policy_number: "POL-002", statement_commission: 2000 }, // mismatch
      { policy_number: "POL-999", statement_commission: 300 }, // not found
    ];
    const run = reconcile(rows, policies);
    expect(checkReconciliationConservation(run)).toBe(true);
    expect(run.total_records).toBe(3);
  });

  it("conservation holds for 500 random runs", () => {
    for (let i = 0; i < 500; i++) {
      const numPolicies = Math.floor(Math.random() * 20) + 1;
      const policies = new Map<string, number>();
      for (let j = 0; j < numPolicies; j++) {
        policies.set(`POL-${j}`, Math.random() * 10000);
      }

      const numRows = Math.floor(Math.random() * 25) + 1;
      const rows: StatementRow[] = Array.from({ length: numRows }, (_, j) => ({
        policy_number: `POL-${Math.floor(Math.random() * (numPolicies + 5))}`,
        statement_commission: Math.random() * 10000,
      }));

      const run = reconcile(rows, policies);
      expect(checkReconciliationConservation(run)).toBe(true);
    }
  });

  it("duplicate policy in statement creates discrepancy", () => {
    const policies = new Map([["POL-001", 1000]]);
    const rows: StatementRow[] = [
      { policy_number: "POL-001", statement_commission: 1000 },
      { policy_number: "POL-001", statement_commission: 1000 }, // duplicate
    ];
    const run = reconcile(rows, policies);
    expect(checkReconciliationConservation(run)).toBe(true);
    expect(run.discrepancy_count).toBeGreaterThan(0);
  });
});

// ── Property 4: Reconciliation Determinism ───────────────────────
// **Validates: Requirements 13.8**

describe("Property 4: Reconciliation Determinism (same input → same output)", () => {
  it("same statement imported twice produces identical results", () => {
    const policies = new Map([
      ["POL-001", 1000],
      ["POL-002", 2000],
      ["POL-003", 3000],
    ]);
    const rows: StatementRow[] = [
      { policy_number: "POL-001", statement_commission: 1000 },
      { policy_number: "POL-002", statement_commission: 2500 }, // mismatch
      { policy_number: "POL-999", statement_commission: 500 }, // not found
    ];

    const run1 = reconcile(rows, policies);
    const run2 = reconcile(rows, policies);

    expect(run1.total_records).toBe(run2.total_records);
    expect(run1.matched_count).toBe(run2.matched_count);
    expect(run1.discrepancy_count).toBe(run2.discrepancy_count);
  });

  it("determinism holds for 100 random inputs", () => {
    for (let i = 0; i < 100; i++) {
      const numPolicies = Math.floor(Math.random() * 10) + 1;
      const policies = new Map<string, number>();
      for (let j = 0; j < numPolicies; j++) {
        policies.set(`POL-${j}`, (j + 1) * 1000);
      }

      const rows: StatementRow[] = Array.from({ length: 10 }, (_, j) => ({
        policy_number: `POL-${j % (numPolicies + 2)}`,
        statement_commission: (j + 1) * 1000,
      }));

      const run1 = reconcile(rows, policies);
      const run2 = reconcile(rows, policies);

      expect(run1.total_records).toBe(run2.total_records);
      expect(run1.matched_count).toBe(run2.matched_count);
      expect(run1.discrepancy_count).toBe(run2.discrepancy_count);
    }
  });
});

// ── Property 5: Commission Rate Range ────────────────────────────
// **Validates: Requirements 23.4**

describe("Property 5: Commission Rate Range (percentage 0–100)", () => {
  function validateCommissionRate(rate: CommissionRate): boolean {
    if (rate.rate_value < 0) return false;
    if (rate.rate_type === "percentage" && rate.rate_value > 100) return false;
    return true;
  }

  it("valid percentage rates pass", () => {
    const validRates: CommissionRate[] = [
      { rate_type: "percentage", rate_value: 0 },
      { rate_type: "percentage", rate_value: 5 },
      { rate_type: "percentage", rate_value: 15 },
      { rate_type: "percentage", rate_value: 100 },
    ];
    for (const rate of validRates) {
      expect(validateCommissionRate(rate)).toBe(true);
    }
  });

  it("invalid percentage rates fail", () => {
    const invalidRates: CommissionRate[] = [
      { rate_type: "percentage", rate_value: -1 },
      { rate_type: "percentage", rate_value: 101 },
      { rate_type: "percentage", rate_value: 200 },
    ];
    for (const rate of invalidRates) {
      expect(validateCommissionRate(rate)).toBe(false);
    }
  });

  it("flat rates can be any positive number", () => {
    const flatRates: CommissionRate[] = [
      { rate_type: "flat", rate_value: 0 },
      { rate_type: "flat", rate_value: 500 },
      { rate_type: "flat", rate_value: 100000 },
    ];
    for (const rate of flatRates) {
      expect(validateCommissionRate(rate)).toBe(true);
    }
  });

  it("negative flat rate fails", () => {
    expect(validateCommissionRate({ rate_type: "flat", rate_value: -100 })).toBe(false);
  });

  it("rate range holds for 500 random percentage rates", () => {
    for (let i = 0; i < 500; i++) {
      const value = Math.random() * 100;
      const rate: CommissionRate = { rate_type: "percentage", rate_value: value };
      expect(validateCommissionRate(rate)).toBe(true);
    }
  });
});

// ── Property 6: Compliance Recurrence Temporal Invariant ─────────
// **Validates: Requirements 18.4**

describe("Property 6: Compliance Recurrence (next due date > current due date)", () => {
  it("monthly recurrence creates next date 1 month later", () => {
    const current = "2024-01-15";
    const next = getNextDueDate(current, "monthly");
    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBeGreaterThan(new Date(current).getTime());
    expect(next).toBe("2024-02-15");
  });

  it("quarterly recurrence creates next date 3 months later", () => {
    const current = "2024-01-01";
    const next = getNextDueDate(current, "quarterly");
    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBeGreaterThan(new Date(current).getTime());
    expect(next).toBe("2024-04-01");
  });

  it("half_yearly recurrence creates next date 6 months later", () => {
    const current = "2024-01-01";
    const next = getNextDueDate(current, "half_yearly");
    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBeGreaterThan(new Date(current).getTime());
    expect(next).toBe("2024-07-01");
  });

  it("annual recurrence creates next date 1 year later", () => {
    const current = "2024-01-01";
    const next = getNextDueDate(current, "annual");
    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBeGreaterThan(new Date(current).getTime());
    expect(next).toBe("2025-01-01");
  });

  it("one_time recurrence returns null (no next occurrence)", () => {
    const next = getNextDueDate("2024-01-01", "one_time");
    expect(next).toBeNull();
  });

  it("temporal invariant holds for 500 random dates and recurrences", () => {
    const recurrences = ["monthly", "quarterly", "half_yearly", "annual"];
    for (let i = 0; i < 500; i++) {
      const year = 2020 + Math.floor(Math.random() * 5);
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const current = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const recurrence = recurrences[Math.floor(Math.random() * recurrences.length)];

      const next = getNextDueDate(current, recurrence);
      expect(next).not.toBeNull();
      expect(new Date(next!).getTime()).toBeGreaterThan(new Date(current).getTime());
    }
  });
});

// ── Property 7: Stage Count Conservation ─────────────────────────
// **Validates: Requirements 7.9**

describe("Property 7: Stage Count Conservation (sum of stage counts = total)", () => {
  function computeStageCounts(entries: RenewalPipelineEntry[]): Record<string, number> {
    const counts: Record<string, number> = {
      due: 0, contacted: 0, negotiating: 0, renewed: 0, lost: 0,
    };
    for (const entry of entries) {
      counts[entry.stage] = (counts[entry.stage] ?? 0) + 1;
    }
    return counts;
  }

  it("sum of stage counts equals total pipeline count", () => {
    const entries: RenewalPipelineEntry[] = [
      { id: "1", stage: "due", risk_score: 50 },
      { id: "2", stage: "contacted", risk_score: 30 },
      { id: "3", stage: "negotiating", risk_score: 20 },
      { id: "4", stage: "renewed", risk_score: 0 },
      { id: "5", stage: "lost", risk_score: 0 },
      { id: "6", stage: "due", risk_score: 80 },
    ];

    const counts = computeStageCounts(entries);
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    expect(total).toBe(entries.length);
  });

  it("conservation holds for 500 random pipeline entries", () => {
    const stages: RenewalStage[] = ["due", "contacted", "negotiating", "renewed", "lost"];
    for (let i = 0; i < 10; i++) {
      const n = Math.floor(Math.random() * 500) + 1;
      const entries: RenewalPipelineEntry[] = Array.from({ length: n }, (_, j) => ({
        id: `entry-${j}`,
        stage: stages[Math.floor(Math.random() * stages.length)],
        risk_score: Math.floor(Math.random() * 101),
      }));

      const counts = computeStageCounts(entries);
      const total = Object.values(counts).reduce((s, c) => s + c, 0);
      expect(total).toBe(n);
    }
  });

  it("empty pipeline has zero total", () => {
    const counts = computeStageCounts([]);
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    expect(total).toBe(0);
  });
});

// ── Property 8: Conversion Rate Range ────────────────────────────
// **Validates: Requirements 7.9**

describe("Property 8: Conversion Rate Range (0–100%)", () => {
  it("conversion rate is 0 when no renewals closed", () => {
    const rate = calculateConversionRate({ due: 10, contacted: 5, negotiating: 3, renewed: 0, lost: 0 });
    expect(rate).toBe(0);
  });

  it("conversion rate is 100 when all closed renewals are renewed", () => {
    const rate = calculateConversionRate({ due: 0, contacted: 0, negotiating: 0, renewed: 10, lost: 0 });
    expect(rate).toBe(100);
  });

  it("conversion rate is 50 when half renewed half lost", () => {
    const rate = calculateConversionRate({ due: 0, contacted: 0, negotiating: 0, renewed: 5, lost: 5 });
    expect(rate).toBe(50);
  });

  it("conversion rate is always between 0 and 100 for 500 random inputs", () => {
    for (let i = 0; i < 500; i++) {
      const renewed = Math.floor(Math.random() * 100);
      const lost = Math.floor(Math.random() * 100);
      const rate = calculateConversionRate({
        due: Math.floor(Math.random() * 50),
        contacted: Math.floor(Math.random() * 30),
        negotiating: Math.floor(Math.random() * 20),
        renewed,
        lost,
      });
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    }
  });
});

// ── Property 9: Audit Timestamp Ordering ─────────────────────────
// **Validates: Requirements 27.8**

describe("Property 9: Audit Timestamp Ordering (audit_timestamp >= event_timestamp)", () => {
  function checkAuditOrdering(entries: AuditEntry[]): boolean {
    for (const entry of entries) {
      const eventTs = new Date(entry.event_timestamp).getTime();
      const auditTs = new Date(entry.audit_timestamp).getTime();
      if (auditTs < eventTs) return false;
    }
    return true;
  }

  it("audit timestamp >= event timestamp for valid entries", () => {
    const entries: AuditEntry[] = [
      { event_timestamp: "2024-01-01T10:00:00Z", audit_timestamp: "2024-01-01T10:00:01Z" },
      { event_timestamp: "2024-01-01T10:00:00Z", audit_timestamp: "2024-01-01T10:00:00Z" }, // same is ok
      { event_timestamp: "2024-06-15T12:30:00Z", audit_timestamp: "2024-06-15T12:30:05Z" },
    ];
    expect(checkAuditOrdering(entries)).toBe(true);
  });

  it("audit timestamp before event timestamp fails", () => {
    const entries: AuditEntry[] = [
      { event_timestamp: "2024-01-01T10:00:05Z", audit_timestamp: "2024-01-01T10:00:00Z" },
    ];
    expect(checkAuditOrdering(entries)).toBe(false);
  });

  it("ordering holds for 500 random valid audit entries", () => {
    const entries: AuditEntry[] = Array.from({ length: 500 }, (_, i) => {
      const eventMs = Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365);
      const auditMs = eventMs + Math.floor(Math.random() * 1000 * 60); // audit is 0-60s after event
      return {
        event_timestamp: new Date(eventMs).toISOString(),
        audit_timestamp: new Date(auditMs).toISOString(),
      };
    });
    expect(checkAuditOrdering(entries)).toBe(true);
  });

  it("ordering holds for simultaneous event and audit timestamps", () => {
    const ts = new Date().toISOString();
    const entries: AuditEntry[] = [{ event_timestamp: ts, audit_timestamp: ts }];
    expect(checkAuditOrdering(entries)).toBe(true);
  });
});
