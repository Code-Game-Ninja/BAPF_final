/**
 * Integration Test: Verification Popup Blocking Save
 *
 * Tests the employee verification schema:
 * - All 5 checks must be true to pass
 * - Partial checks fail validation
 * - Schema rejects non-boolean values
 * - Verification flow gates policy save
 */

import { describe, it, expect } from "vitest";
import { verificationSchema, policySchema } from "@/lib/validations/policy";

describe("Verification Popup Blocking Save", () => {
  // ---- Happy path: all checks true ----
  it("passes when all 5 verification items are true", () => {
    const data = {
      policyNumberCorrect: true as const,
      datesCorrect: true as const,
      premiumCorrect: true as const,
      customerCorrect: true as const,
      finalConfirmation: true as const,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  // ---- Single item false ----
  it("fails when policyNumberCorrect is false", () => {
    const data = {
      policyNumberCorrect: false,
      datesCorrect: true,
      premiumCorrect: true,
      customerCorrect: true,
      finalConfirmation: true,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("fails when datesCorrect is false", () => {
    const data = {
      policyNumberCorrect: true,
      datesCorrect: false,
      premiumCorrect: true,
      customerCorrect: true,
      finalConfirmation: true,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("fails when premiumCorrect is false", () => {
    const data = {
      policyNumberCorrect: true,
      datesCorrect: true,
      premiumCorrect: false,
      customerCorrect: true,
      finalConfirmation: true,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("fails when customerCorrect is false", () => {
    const data = {
      policyNumberCorrect: true,
      datesCorrect: true,
      premiumCorrect: true,
      customerCorrect: false,
      finalConfirmation: true,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("fails when finalConfirmation is false", () => {
    const data = {
      policyNumberCorrect: true,
      datesCorrect: true,
      premiumCorrect: true,
      customerCorrect: true,
      finalConfirmation: false,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // ---- Multiple items false ----
  it("fails when multiple items are false", () => {
    const data = {
      policyNumberCorrect: false,
      datesCorrect: false,
      premiumCorrect: true,
      customerCorrect: true,
      finalConfirmation: true,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // ---- All false ----
  it("fails when all items are false", () => {
    const data = {
      policyNumberCorrect: false,
      datesCorrect: false,
      premiumCorrect: false,
      customerCorrect: false,
      finalConfirmation: false,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // ---- Missing fields ----
  it("fails with missing fields", () => {
    const data = {
      policyNumberCorrect: true,
      datesCorrect: true,
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // ---- Invalid types ----
  it("fails with string values instead of boolean", () => {
    const data = {
      policyNumberCorrect: "true",
      datesCorrect: "true",
      premiumCorrect: "true",
      customerCorrect: "true",
      finalConfirmation: "true",
    };
    const result = verificationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("fails with empty object", () => {
    const result = verificationSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---- Policy Schema validation for the form ----
describe("Policy Form Validation Gates", () => {
  const validPolicy = {
    policy_type: "motor" as const,
    customer_id: "cust-001",
    customer_name: "Test Customer",
    start_date: "2026-01-01",
    end_date: "2027-01-01",
    premium_amount: 15000,
    assigned_to: "emp-001",
  };

  it("accepts a valid policy form", () => {
    const result = policySchema.safeParse(validPolicy);
    expect(result.success).toBe(true);
  });

  it("rejects missing customer_id", () => {
    const { customer_id, ...rest } = validPolicy;
    const result = policySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects negative premium", () => {
    const result = policySchema.safeParse({
      ...validPolicy,
      premium_amount: -500,
    });
    expect(result.success).toBe(false);
  });

  it("rejects end_date before start_date", () => {
    const result = policySchema.safeParse({
      ...validPolicy,
      start_date: "2027-01-01",
      end_date: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid policy type", () => {
    const result = policySchema.safeParse({
      ...validPolicy,
      policy_type: "crypto",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as empty string", () => {
    const result = policySchema.safeParse({
      ...validPolicy,
      policy_number: "",
      insurer_name: "",
      remark: "",
      branch_id: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects remark over 500 chars", () => {
    const result = policySchema.safeParse({
      ...validPolicy,
      remark: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
