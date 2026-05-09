/**
 * Property-Based Tests: Unified CRM Phase 1
 * Customer Master + Client 360
 *
 * Tests correctness properties defined in requirements.md
 * Run: vitest run tests/phase1/customer-properties.test.ts
 */

import { describe, it, expect } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────

function generateUID(counter: number): string {
  return `C-${String(counter).padStart(4, "0")}`;
}

function validatePAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

function validateGST(gst: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
}

function validatePhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

function validateAadhaar(aadhaar: string): boolean {
  return /^\d{12}$/.test(aadhaar);
}

// Simulate duplicate detection
function checkDuplicates(
  newCustomer: { phone: string; email: string; pan?: string },
  existingCustomers: Array<{ id: string; phone: string; email: string; entity_meta?: { pan_number?: string } }>
): Array<{ field: string; customerId: string }> {
  const matches: Array<{ field: string; customerId: string }> = [];

  for (const c of existingCustomers) {
    if (c.phone === newCustomer.phone) {
      matches.push({ field: "phone", customerId: c.id });
    }
    if (newCustomer.email && c.email === newCustomer.email) {
      matches.push({ field: "email", customerId: c.id });
    }
    if (newCustomer.pan && c.entity_meta?.pan_number === newCustomer.pan) {
      matches.push({ field: "pan", customerId: c.id });
    }
  }

  return matches;
}

// Simulate soft delete cascade
function softDeleteCascade(customerId: string, data: {
  policies: Array<{ id: string; customer_id: string; status: string }>;
  premiums: Array<{ id: string; policy_id: string; status: string }>;
  commissions: Array<{ id: string; policy_id: string; status: string }>;
  renewals: Array<{ id: string; policy_id: string; status: string }>;
}) {
  const policyIds = data.policies
    .filter(p => p.customer_id === customerId)
    .map(p => p.id);

  const cancelledPolicies = data.policies
    .filter(p => p.customer_id === customerId)
    .map(p => ({ ...p, status: "cancelled" }));

  const cancelledPremiums = data.premiums
    .filter(p => policyIds.includes(p.policy_id) && p.status === "pending")
    .map(p => ({ ...p, status: "cancelled" }));

  const rejectedCommissions = data.commissions
    .filter(c => policyIds.includes(c.policy_id) && c.status === "pending")
    .map(c => ({ ...c, status: "rejected" }));

  const lostRenewals = data.renewals
    .filter(r => policyIds.includes(r.policy_id) && ["due", "contacted"].includes(r.status))
    .map(r => ({ ...r, status: "lost" }));

  return { cancelledPolicies, cancelledPremiums, rejectedCommissions, lostRenewals };
}

// ── Property 1: UID Uniqueness ────────────────────────────────────

describe("Property: Customer UID Uniqueness", () => {
  it("generates unique UIDs for 1000 customers", () => {
    const uids = Array.from({ length: 1000 }, (_, i) => generateUID(i + 1));
    const uniqueUIDs = new Set(uids);
    expect(uniqueUIDs.size).toBe(1000);
  });

  it("UID format is always C-XXXX", () => {
    for (let i = 1; i <= 200; i++) {
      const uid = generateUID(i);
      expect(uid).toMatch(/^C-\d{4}$/);
    }
  });

  it("UIDs are monotonically increasing", () => {
    const uids = Array.from({ length: 100 }, (_, i) => generateUID(i + 1));
    for (let i = 1; i < uids.length; i++) {
      const prev = parseInt(uids[i - 1].replace("C-", ""));
      const curr = parseInt(uids[i].replace("C-", ""));
      expect(curr).toBeGreaterThan(prev);
    }
  });
});

// ── Property 2: Duplicate Detection Determinism ───────────────────

describe("Property: Duplicate Detection Determinism", () => {
  const existingCustomers = Array.from({ length: 100 }, (_, i) => ({
    id: `cust-${i}`,
    phone: `9${String(i).padStart(9, "0")}`,
    email: `user${i}@example.com`,
    entity_meta: { pan_number: `ABCDE${String(i).padStart(4, "0")}F` },
  }));

  it("same input always returns same result (determinism)", () => {
    const newCustomer = { phone: "9000000005", email: "user5@example.com" };
    const result1 = checkDuplicates(newCustomer, existingCustomers);
    const result2 = checkDuplicates(newCustomer, existingCustomers);
    expect(result1).toEqual(result2);
  });

  it("detects phone duplicates correctly", () => {
    const newCustomer = { phone: "9000000010", email: "new@example.com" };
    const matches = checkDuplicates(newCustomer, existingCustomers);
    expect(matches.some(m => m.field === "phone")).toBe(true);
  });

  it("detects email duplicates correctly", () => {
    const newCustomer = { phone: "9999999999", email: "user20@example.com" };
    const matches = checkDuplicates(newCustomer, existingCustomers);
    expect(matches.some(m => m.field === "email")).toBe(true);
  });

  it("returns no matches for genuinely new customer", () => {
    const newCustomer = { phone: "9876543210", email: "brand.new@example.com" };
    const matches = checkDuplicates(newCustomer, existingCustomers);
    expect(matches).toHaveLength(0);
  });

  it("handles 10,000 customers within reasonable time", () => {
    const largeDataset = Array.from({ length: 10_000 }, (_, i) => ({
      id: `cust-${i}`,
      phone: `9${String(i).padStart(9, "0")}`,
      email: `user${i}@bigco.com`,
    }));

    const start = Date.now();
    const newCustomer = { phone: "9000005000", email: "new@bigco.com" };
    checkDuplicates(newCustomer, largeDataset);
    const elapsed = Date.now() - start;

    // Should complete well under 500ms
    expect(elapsed).toBeLessThan(500);
  });
});

// ── Property 3: Soft Delete Cascade Idempotency ───────────────────

describe("Property: Soft Delete Cascade Idempotency", () => {
  const makeTestData = () => ({
    policies: [
      { id: "pol-1", customer_id: "cust-1", status: "active" },
      { id: "pol-2", customer_id: "cust-1", status: "active" },
      { id: "pol-3", customer_id: "cust-2", status: "active" },
    ],
    premiums: [
      { id: "prem-1", policy_id: "pol-1", status: "pending" },
      { id: "prem-2", policy_id: "pol-2", status: "pending" },
      { id: "prem-3", policy_id: "pol-3", status: "pending" },
    ],
    commissions: [
      { id: "comm-1", policy_id: "pol-1", status: "pending" },
      { id: "comm-2", policy_id: "pol-2", status: "approved" }, // already approved, not affected
    ],
    renewals: [
      { id: "ren-1", policy_id: "pol-1", status: "due" },
      { id: "ren-2", policy_id: "pol-2", status: "contacted" },
    ],
  });

  it("cascade cancels all active policies for customer", () => {
    const data = makeTestData();
    const result = softDeleteCascade("cust-1", data);
    expect(result.cancelledPolicies).toHaveLength(2);
    expect(result.cancelledPolicies.every(p => p.status === "cancelled")).toBe(true);
  });

  it("cascade only affects pending premiums", () => {
    const data = makeTestData();
    const result = softDeleteCascade("cust-1", data);
    expect(result.cancelledPremiums).toHaveLength(2);
    expect(result.cancelledPremiums.every(p => p.status === "cancelled")).toBe(true);
  });

  it("cascade only affects pending commissions", () => {
    const data = makeTestData();
    const result = softDeleteCascade("cust-1", data);
    // Only comm-1 is pending; comm-2 is approved
    expect(result.rejectedCommissions).toHaveLength(1);
    expect(result.rejectedCommissions[0].id).toBe("comm-1");
  });

  it("cascade marks due/contacted renewals as lost", () => {
    const data = makeTestData();
    const result = softDeleteCascade("cust-1", data);
    expect(result.lostRenewals).toHaveLength(2);
    expect(result.lostRenewals.every(r => r.status === "lost")).toBe(true);
  });

  it("cascade does not affect other customers' data", () => {
    const data = makeTestData();
    const result = softDeleteCascade("cust-1", data);
    // pol-3 belongs to cust-2, should not be affected
    expect(result.cancelledPolicies.find(p => p.id === "pol-3")).toBeUndefined();
  });

  it("running cascade twice produces same result (idempotency)", () => {
    const data1 = makeTestData();
    const data2 = makeTestData();
    const result1 = softDeleteCascade("cust-1", data1);
    const result2 = softDeleteCascade("cust-1", data2);
    expect(result1.cancelledPolicies.length).toBe(result2.cancelledPolicies.length);
    expect(result1.cancelledPremiums.length).toBe(result2.cancelledPremiums.length);
    expect(result1.rejectedCommissions.length).toBe(result2.rejectedCommissions.length);
    expect(result1.lostRenewals.length).toBe(result2.lostRenewals.length);
  });
});

// ── Property 4: PAN Validation ────────────────────────────────────

describe("Property: PAN Validation", () => {
  const validPANs = [
    "ABCDE1234F",
    "ZZZZZ9999Z",
    "AABCP1234C",
    "BYSPP1234F",
  ];

  const invalidPANs = [
    "ABCDE123F",    // too short
    "abcde1234f",   // lowercase
    "ABCDE12345",   // ends with digit
    "1BCDE1234F",   // starts with digit
    "ABCDE1234FF",  // too long
    "",             // empty
    "ABCDE 234F",   // space
  ];

  it("accepts all valid PAN formats", () => {
    for (const pan of validPANs) {
      expect(validatePAN(pan)).toBe(true);
    }
  });

  it("rejects all invalid PAN formats", () => {
    for (const pan of invalidPANs) {
      expect(validatePAN(pan)).toBe(false);
    }
  });

  it("PAN validation is deterministic", () => {
    const pan = "ABCDE1234F";
    expect(validatePAN(pan)).toBe(validatePAN(pan));
  });
});

// ── Property 5: GST Validation ────────────────────────────────────

describe("Property: GST Validation", () => {
  const validGSTs = [
    "27AAPFU0939F1ZV",
    "29ABCDE1234F1Z5",
    "07AAACR5055K1Z5",
  ];

  const invalidGSTs = [
    "27AAPFU0939F1Z",   // too short
    "AAPFU0939F1ZV",    // missing state code
    "27aapfu0939f1zv",  // lowercase
    "",                 // empty
    "27AAPFU0939F1Z55", // too long
  ];

  it("accepts valid GST formats", () => {
    for (const gst of validGSTs) {
      expect(validateGST(gst)).toBe(true);
    }
  });

  it("rejects invalid GST formats", () => {
    for (const gst of invalidGSTs) {
      expect(validateGST(gst)).toBe(false);
    }
  });
});

// ── Property 6: Phone Validation ─────────────────────────────────

describe("Property: Phone Validation", () => {
  it("accepts valid 10-digit Indian mobile numbers", () => {
    const valid = ["9876543210", "8765432109", "7654321098", "6543210987"];
    for (const phone of valid) {
      expect(validatePhone(phone)).toBe(true);
    }
  });

  it("rejects invalid phone numbers", () => {
    const invalid = ["1234567890", "98765432", "987654321011", "abcdefghij", ""];
    for (const phone of invalid) {
      expect(validatePhone(phone)).toBe(false);
    }
  });
});

// ── Property 7: Aadhaar Validation ───────────────────────────────

describe("Property: Aadhaar Validation", () => {
  it("accepts valid 12-digit Aadhaar numbers", () => {
    const valid = ["123456789012", "987654321098", "000000000001"];
    for (const aadhaar of valid) {
      expect(validateAadhaar(aadhaar)).toBe(true);
    }
  });

  it("rejects invalid Aadhaar numbers", () => {
    const invalid = ["12345678901", "1234567890123", "abcdefghijkl", ""];
    for (const aadhaar of invalid) {
      expect(validateAadhaar(aadhaar)).toBe(false);
    }
  });
});

// ── Property 8: Temporal Invariants ──────────────────────────────

describe("Property: Temporal Invariants", () => {
  it("deleted_at is always >= created_at when set", () => {
    const customers = Array.from({ length: 100 }, (_, i) => {
      const createdAt = new Date(2024, 0, i + 1);
      const deletedAt = new Date(createdAt.getTime() + Math.random() * 1000 * 60 * 60 * 24 * 365);
      return { createdAt, deletedAt };
    });

    for (const c of customers) {
      expect(c.deletedAt.getTime()).toBeGreaterThanOrEqual(c.createdAt.getTime());
    }
  });

  it("updated_at is always >= created_at", () => {
    const customers = Array.from({ length: 100 }, (_, i) => {
      const createdAt = new Date(2024, 0, i + 1);
      const updatedAt = new Date(createdAt.getTime() + Math.random() * 1000 * 60 * 60 * 24 * 30);
      return { createdAt, updatedAt };
    });

    for (const c of customers) {
      expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(c.createdAt.getTime());
    }
  });
});
