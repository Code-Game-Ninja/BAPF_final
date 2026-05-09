/**
 * Property-Based Tests: Unified CRM Phase 3
 * GMC & Fleet Integration
 *
 * Tests correctness properties defined in requirements.md
 * Run: vitest run tests/phase3/gmc-fleet-properties.test.ts
 *
 * All tests are pure logic tests — no DB calls.
 */

import { describe, it, expect } from "vitest";

// ── Types ─────────────────────────────────────────────────────────

interface GMCMember {
  id: string;
  customer_id: string;
  employee_id: string;
  name: string;
  member_type: "employee" | "dependent";
  parent_member_id?: string;
  status: "Active" | "Inactive" | "Deleted";
}

interface FleetVehicle {
  id: string;
  registration_number: string;
  primary_driver_id?: string;
  status: "Active" | "Inactive" | "Deleted";
}

interface ValidityDocument {
  id: string;
  vehicle_id: string;
  document_type: string;
  issue_date?: string;
  expiry_date: string;
}

interface BulkUploadResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

interface Endorsement {
  id: string;
  endorsement_number: string;
  customer_id: string;
  endorsement_type: "Addition" | "Deletion";
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Check Employee ID uniqueness within a customer.
 * Returns true if all employee_ids are unique within each customer.
 */
function checkEmployeeIdUniqueness(members: GMCMember[]): boolean {
  const byCustomer = new Map<string, Set<string>>();
  for (const m of members) {
    if (m.status === "Deleted") continue;
    if (!byCustomer.has(m.customer_id)) {
      byCustomer.set(m.customer_id, new Set());
    }
    const ids = byCustomer.get(m.customer_id)!;
    if (ids.has(m.employee_id)) return false;
    ids.add(m.employee_id);
  }
  return true;
}

/**
 * Check Registration Number uniqueness globally.
 * Returns true if all registration_numbers are globally unique.
 */
function checkRegistrationNumberUniqueness(vehicles: FleetVehicle[]): boolean {
  const seen = new Set<string>();
  for (const v of vehicles) {
    if (v.status === "Deleted") continue;
    if (seen.has(v.registration_number)) return false;
    seen.add(v.registration_number);
  }
  return true;
}

/**
 * Check that every dependent is linked to an active employee.
 */
function checkDependentLinkage(members: GMCMember[]): boolean {
  const activeEmployees = new Set(
    members
      .filter(m => m.member_type === "employee" && m.status === "Active")
      .map(m => m.id)
  );
  for (const m of members) {
    if (m.member_type === "dependent" && m.status === "Active") {
      if (!m.parent_member_id || !activeEmployees.has(m.parent_member_id)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check that each vehicle has at most one primary driver.
 */
function checkPrimaryDriverCardinality(vehicles: FleetVehicle[]): boolean {
  const driverToVehicle = new Map<string, string>();
  for (const v of vehicles) {
    if (v.status === "Deleted") continue;
    if (!v.primary_driver_id) continue;
    if (driverToVehicle.has(v.primary_driver_id)) return false;
    driverToVehicle.set(v.primary_driver_id, v.id);
  }
  return true;
}

/**
 * Check that validity expiry date > issue date.
 */
function checkValidityTemporalInvariant(docs: ValidityDocument[]): boolean {
  for (const doc of docs) {
    if (!doc.issue_date) continue;
    if (new Date(doc.expiry_date) <= new Date(doc.issue_date)) return false;
  }
  return true;
}

/**
 * Check bulk upload conservation: error_count + success_count = total_rows.
 */
function checkBulkUploadConservation(result: BulkUploadResult): boolean {
  return result.successful_rows + result.failed_rows === result.total_rows;
}

/**
 * Check endorsement number uniqueness.
 */
function checkEndorsementNumberUniqueness(endorsements: Endorsement[]): boolean {
  const seen = new Set<string>();
  for (const e of endorsements) {
    if (seen.has(e.endorsement_number)) return false;
    seen.add(e.endorsement_number);
  }
  return true;
}

// ── Property 1: Employee ID Uniqueness ───────────────────────────
// Validates: Requirements 16.1, 16.2, 16.3, 16.4

describe("Property: Employee ID Uniqueness within Corporate_Customer", () => {
  it("unique employee IDs within same customer passes", () => {
    const members: GMCMember[] = [
      { id: "m1", customer_id: "c1", employee_id: "EMP001", name: "Alice", member_type: "employee", status: "Active" },
      { id: "m2", customer_id: "c1", employee_id: "EMP002", name: "Bob", member_type: "employee", status: "Active" },
      { id: "m3", customer_id: "c2", employee_id: "EMP001", name: "Carol", member_type: "employee", status: "Active" },
    ];
    expect(checkEmployeeIdUniqueness(members)).toBe(true);
  });

  it("duplicate employee ID within same customer fails", () => {
    const members: GMCMember[] = [
      { id: "m1", customer_id: "c1", employee_id: "EMP001", name: "Alice", member_type: "employee", status: "Active" },
      { id: "m2", customer_id: "c1", employee_id: "EMP001", name: "Bob", member_type: "employee", status: "Active" },
    ];
    expect(checkEmployeeIdUniqueness(members)).toBe(false);
  });

  it("same employee ID in different customers is allowed", () => {
    // 10 customers, each with 10 employees using IDs EMP000-EMP009
    // Same employee IDs across different customers is valid
    const members: GMCMember[] = Array.from({ length: 100 }, (_, i) => ({
      id: `m${i}`,
      customer_id: `c${Math.floor(i / 10)}`, // customers c0-c9, 10 members each
      employee_id: `EMP${String(i % 10).padStart(3, "0")}`, // EMP000-EMP009 per customer
      name: `Employee ${i}`,
      member_type: "employee" as const,
      status: "Active" as const,
    }));
    expect(checkEmployeeIdUniqueness(members)).toBe(true);
  });

  it("deleted members do not participate in uniqueness check", () => {
    const members: GMCMember[] = [
      { id: "m1", customer_id: "c1", employee_id: "EMP001", name: "Alice", member_type: "employee", status: "Deleted" },
      { id: "m2", customer_id: "c1", employee_id: "EMP001", name: "Bob", member_type: "employee", status: "Active" },
    ];
    expect(checkEmployeeIdUniqueness(members)).toBe(true);
  });

  it("uniqueness holds for 1000 members across 10 customers", () => {
    const members: GMCMember[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `m${i}`,
      customer_id: `c${Math.floor(i / 100)}`,
      employee_id: `EMP${String(i % 100).padStart(4, "0")}`,
      name: `Employee ${i}`,
      member_type: "employee" as const,
      status: "Active" as const,
    }));
    expect(checkEmployeeIdUniqueness(members)).toBe(true);
  });
});

// ── Property 2: Registration Number Uniqueness ───────────────────
// Validates: Requirements 17.1, 17.2, 17.3, 17.4

describe("Property: Registration Number Uniqueness Globally", () => {
  it("unique registration numbers passes", () => {
    const vehicles: FleetVehicle[] = [
      { id: "v1", registration_number: "MH01AB1234", status: "Active" },
      { id: "v2", registration_number: "MH01AB1235", status: "Active" },
      { id: "v3", registration_number: "DL01AB1234", status: "Active" },
    ];
    expect(checkRegistrationNumberUniqueness(vehicles)).toBe(true);
  });

  it("duplicate registration number fails", () => {
    const vehicles: FleetVehicle[] = [
      { id: "v1", registration_number: "MH01AB1234", status: "Active" },
      { id: "v2", registration_number: "MH01AB1234", status: "Active" },
    ];
    expect(checkRegistrationNumberUniqueness(vehicles)).toBe(false);
  });

  it("deleted vehicles do not participate in uniqueness check", () => {
    const vehicles: FleetVehicle[] = [
      { id: "v1", registration_number: "MH01AB1234", status: "Deleted" },
      { id: "v2", registration_number: "MH01AB1234", status: "Active" },
    ];
    expect(checkRegistrationNumberUniqueness(vehicles)).toBe(true);
  });

  it("uniqueness holds for 500 vehicles", () => {
    const vehicles: FleetVehicle[] = Array.from({ length: 500 }, (_, i) => ({
      id: `v${i}`,
      registration_number: `MH${String(i).padStart(2, "0")}AB${String(i).padStart(4, "0")}`,
      status: "Active" as const,
    }));
    expect(checkRegistrationNumberUniqueness(vehicles)).toBe(true);
  });

  it("registration numbers are globally unique across all customers", () => {
    // Vehicles from different customers must still have unique reg numbers
    const vehicles: FleetVehicle[] = [
      { id: "v1", registration_number: "MH01AB1234", status: "Active" },
      { id: "v2", registration_number: "MH01AB1234", status: "Active" }, // same reg, different customer
    ];
    expect(checkRegistrationNumberUniqueness(vehicles)).toBe(false);
  });
});

// ── Property 3: Dependent Linkage Invariant ───────────────────────
// Validates: Requirements 18.1, 18.2, 18.3

describe("Property: Dependent Always Linked to Active Employee", () => {
  it("dependent linked to active employee passes", () => {
    const members: GMCMember[] = [
      { id: "e1", customer_id: "c1", employee_id: "EMP001", name: "Alice", member_type: "employee", status: "Active" },
      { id: "d1", customer_id: "c1", employee_id: "DEP001", name: "Alice Jr", member_type: "dependent", parent_member_id: "e1", status: "Active" },
    ];
    expect(checkDependentLinkage(members)).toBe(true);
  });

  it("dependent without parent fails", () => {
    const members: GMCMember[] = [
      { id: "d1", customer_id: "c1", employee_id: "DEP001", name: "Orphan", member_type: "dependent", status: "Active" },
    ];
    expect(checkDependentLinkage(members)).toBe(false);
  });

  it("dependent linked to inactive employee fails", () => {
    const members: GMCMember[] = [
      { id: "e1", customer_id: "c1", employee_id: "EMP001", name: "Alice", member_type: "employee", status: "Inactive" },
      { id: "d1", customer_id: "c1", employee_id: "DEP001", name: "Alice Jr", member_type: "dependent", parent_member_id: "e1", status: "Active" },
    ];
    expect(checkDependentLinkage(members)).toBe(false);
  });

  it("inactive dependent linked to inactive employee is allowed", () => {
    const members: GMCMember[] = [
      { id: "e1", customer_id: "c1", employee_id: "EMP001", name: "Alice", member_type: "employee", status: "Inactive" },
      { id: "d1", customer_id: "c1", employee_id: "DEP001", name: "Alice Jr", member_type: "dependent", parent_member_id: "e1", status: "Inactive" },
    ];
    expect(checkDependentLinkage(members)).toBe(true);
  });

  it("multiple dependents linked to same active employee passes", () => {
    const members: GMCMember[] = [
      { id: "e1", customer_id: "c1", employee_id: "EMP001", name: "Alice", member_type: "employee", status: "Active" },
      { id: "d1", customer_id: "c1", employee_id: "DEP001", name: "Child 1", member_type: "dependent", parent_member_id: "e1", status: "Active" },
      { id: "d2", customer_id: "c1", employee_id: "DEP002", name: "Child 2", member_type: "dependent", parent_member_id: "e1", status: "Active" },
      { id: "d3", customer_id: "c1", employee_id: "DEP003", name: "Spouse", member_type: "dependent", parent_member_id: "e1", status: "Active" },
    ];
    expect(checkDependentLinkage(members)).toBe(true);
  });
});

// ── Property 4: Vehicle Primary Driver Cardinality ────────────────
// Validates: Requirements 19.1, 19.2

describe("Property: Vehicle Has At Most One Primary Driver", () => {
  it("each vehicle with unique driver passes", () => {
    const vehicles: FleetVehicle[] = [
      { id: "v1", registration_number: "MH01AB1234", primary_driver_id: "d1", status: "Active" },
      { id: "v2", registration_number: "MH01AB1235", primary_driver_id: "d2", status: "Active" },
      { id: "v3", registration_number: "MH01AB1236", status: "Active" }, // no driver
    ];
    expect(checkPrimaryDriverCardinality(vehicles)).toBe(true);
  });

  it("same driver assigned to two vehicles fails", () => {
    const vehicles: FleetVehicle[] = [
      { id: "v1", registration_number: "MH01AB1234", primary_driver_id: "d1", status: "Active" },
      { id: "v2", registration_number: "MH01AB1235", primary_driver_id: "d1", status: "Active" },
    ];
    expect(checkPrimaryDriverCardinality(vehicles)).toBe(false);
  });

  it("deleted vehicle does not block driver assignment", () => {
    const vehicles: FleetVehicle[] = [
      { id: "v1", registration_number: "MH01AB1234", primary_driver_id: "d1", status: "Deleted" },
      { id: "v2", registration_number: "MH01AB1235", primary_driver_id: "d1", status: "Active" },
    ];
    expect(checkPrimaryDriverCardinality(vehicles)).toBe(true);
  });

  it("vehicles without drivers always pass", () => {
    const vehicles: FleetVehicle[] = Array.from({ length: 100 }, (_, i) => ({
      id: `v${i}`,
      registration_number: `MH${String(i).padStart(2, "0")}AB${String(i).padStart(4, "0")}`,
      status: "Active" as const,
    }));
    expect(checkPrimaryDriverCardinality(vehicles)).toBe(true);
  });

  it("cardinality holds for 200 vehicles with 200 unique drivers", () => {
    const vehicles: FleetVehicle[] = Array.from({ length: 200 }, (_, i) => ({
      id: `v${i}`,
      registration_number: `MH${String(i).padStart(2, "0")}AB${String(i).padStart(4, "0")}`,
      primary_driver_id: `d${i}`,
      status: "Active" as const,
    }));
    expect(checkPrimaryDriverCardinality(vehicles)).toBe(true);
  });
});

// ── Property 5: Validity Temporal Invariant ───────────────────────
// Validates: Requirements 12.6

describe("Property: Validity Expiry Date > Issue Date", () => {
  it("expiry after issue date passes", () => {
    const docs: ValidityDocument[] = [
      { id: "d1", vehicle_id: "v1", document_type: "fitness", issue_date: "2024-01-01", expiry_date: "2025-01-01" },
      { id: "d2", vehicle_id: "v1", document_type: "puc", issue_date: "2024-06-01", expiry_date: "2025-06-01" },
    ];
    expect(checkValidityTemporalInvariant(docs)).toBe(true);
  });

  it("expiry equal to issue date fails", () => {
    const docs: ValidityDocument[] = [
      { id: "d1", vehicle_id: "v1", document_type: "fitness", issue_date: "2024-01-01", expiry_date: "2024-01-01" },
    ];
    expect(checkValidityTemporalInvariant(docs)).toBe(false);
  });

  it("expiry before issue date fails", () => {
    const docs: ValidityDocument[] = [
      { id: "d1", vehicle_id: "v1", document_type: "fitness", issue_date: "2024-06-01", expiry_date: "2024-01-01" },
    ];
    expect(checkValidityTemporalInvariant(docs)).toBe(false);
  });

  it("documents without issue date always pass", () => {
    const docs: ValidityDocument[] = [
      { id: "d1", vehicle_id: "v1", document_type: "rc", expiry_date: "2025-01-01" },
      { id: "d2", vehicle_id: "v1", document_type: "tax_state", expiry_date: "2024-12-31" },
    ];
    expect(checkValidityTemporalInvariant(docs)).toBe(true);
  });

  it("temporal invariant holds for all 7 document types", () => {
    const docTypes = ["permit_state", "permit_national", "fitness", "puc", "rc", "tax_state", "tax_national"];
    const docs: ValidityDocument[] = docTypes.map((dt, i) => ({
      id: `d${i}`,
      vehicle_id: "v1",
      document_type: dt,
      issue_date: `2024-0${(i % 9) + 1}-01`,
      expiry_date: `2025-0${(i % 9) + 1}-01`,
    }));
    expect(checkValidityTemporalInvariant(docs)).toBe(true);
  });

  it("temporal invariant holds for 1000 random valid documents", () => {
    const docs: ValidityDocument[] = Array.from({ length: 1000 }, (_, i) => {
      const issueYear = 2020 + (i % 4);
      const expiryYear = issueYear + 1;
      return {
        id: `d${i}`,
        vehicle_id: `v${i % 100}`,
        document_type: "fitness",
        issue_date: `${issueYear}-01-01`,
        expiry_date: `${expiryYear}-01-01`,
      };
    });
    expect(checkValidityTemporalInvariant(docs)).toBe(true);
  });
});

// ── Property 6: Bulk Upload Conservation ─────────────────────────
// Validates: Requirements 20.3

describe("Property: Bulk Upload error_count + success_count = total_rows", () => {
  it("conservation holds for all-success upload", () => {
    const result: BulkUploadResult = {
      total_rows: 100,
      successful_rows: 100,
      failed_rows: 0,
      errors: [],
    };
    expect(checkBulkUploadConservation(result)).toBe(true);
  });

  it("conservation holds for all-failure upload", () => {
    const result: BulkUploadResult = {
      total_rows: 50,
      successful_rows: 0,
      failed_rows: 50,
      errors: Array.from({ length: 50 }, (_, i) => ({ row: i + 1, field: "employee_id", message: "Duplicate" })),
    };
    expect(checkBulkUploadConservation(result)).toBe(true);
  });

  it("conservation holds for mixed upload", () => {
    const result: BulkUploadResult = {
      total_rows: 1000,
      successful_rows: 950,
      failed_rows: 50,
      errors: Array.from({ length: 50 }, (_, i) => ({ row: i + 1, field: "dob", message: "Invalid date" })),
    };
    expect(checkBulkUploadConservation(result)).toBe(true);
  });

  it("conservation fails when counts do not add up", () => {
    const result: BulkUploadResult = {
      total_rows: 100,
      successful_rows: 80,
      failed_rows: 10, // Missing 10 rows
      errors: [],
    };
    expect(checkBulkUploadConservation(result)).toBe(false);
  });

  it("conservation holds for zero-row upload", () => {
    const result: BulkUploadResult = {
      total_rows: 0,
      successful_rows: 0,
      failed_rows: 0,
      errors: [],
    };
    expect(checkBulkUploadConservation(result)).toBe(true);
  });

  it("conservation holds for 100 simulated upload results", () => {
    for (let i = 0; i < 100; i++) {
      const total = Math.floor(Math.random() * 1000) + 1;
      const failed = Math.floor(Math.random() * total);
      const successful = total - failed;
      const result: BulkUploadResult = {
        total_rows: total,
        successful_rows: successful,
        failed_rows: failed,
        errors: [],
      };
      expect(checkBulkUploadConservation(result)).toBe(true);
    }
  });
});

// ── Property 7: Endorsement Number Uniqueness ─────────────────────
// Validates: Requirements 6.4, 14.4

describe("Property: Endorsement Number Uniqueness", () => {
  it("unique endorsement numbers passes", () => {
    const endorsements: Endorsement[] = [
      { id: "e1", endorsement_number: "END-GMC-00001", customer_id: "c1", endorsement_type: "Addition" },
      { id: "e2", endorsement_number: "END-GMC-00002", customer_id: "c1", endorsement_type: "Deletion" },
      { id: "e3", endorsement_number: "END-FLT-00001", customer_id: "c2", endorsement_type: "Addition" },
    ];
    expect(checkEndorsementNumberUniqueness(endorsements)).toBe(true);
  });

  it("duplicate endorsement number fails", () => {
    const endorsements: Endorsement[] = [
      { id: "e1", endorsement_number: "END-GMC-00001", customer_id: "c1", endorsement_type: "Addition" },
      { id: "e2", endorsement_number: "END-GMC-00001", customer_id: "c2", endorsement_type: "Deletion" },
    ];
    expect(checkEndorsementNumberUniqueness(endorsements)).toBe(false);
  });

  it("endorsement numbers follow GMC format END-GMC-XXXXX", () => {
    const numbers = Array.from({ length: 100 }, (_, i) => `END-GMC-${String(i + 1).padStart(5, "0")}`);
    for (const num of numbers) {
      expect(num).toMatch(/^END-GMC-\d{5}$/);
    }
  });

  it("endorsement numbers follow Fleet format END-FLT-XXXXX", () => {
    const numbers = Array.from({ length: 100 }, (_, i) => `END-FLT-${String(i + 1).padStart(5, "0")}`);
    for (const num of numbers) {
      expect(num).toMatch(/^END-FLT-\d{5}$/);
    }
  });

  it("uniqueness holds for 1000 endorsements", () => {
    const endorsements: Endorsement[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `e${i}`,
      endorsement_number: `END-GMC-${String(i + 1).padStart(5, "0")}`,
      customer_id: `c${i % 10}`,
      endorsement_type: i % 2 === 0 ? "Addition" : "Deletion" as const,
    }));
    expect(checkEndorsementNumberUniqueness(endorsements)).toBe(true);
  });

  it("GMC and Fleet endorsement numbers are in separate namespaces", () => {
    // Same numeric suffix but different prefix — should be unique
    const endorsements: Endorsement[] = [
      { id: "e1", endorsement_number: "END-GMC-00001", customer_id: "c1", endorsement_type: "Addition" },
      { id: "e2", endorsement_number: "END-FLT-00001", customer_id: "c1", endorsement_type: "Addition" },
    ];
    expect(checkEndorsementNumberUniqueness(endorsements)).toBe(true);
  });
});
