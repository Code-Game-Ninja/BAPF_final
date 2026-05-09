/**
 * lib/validation/index.ts
 * Re-export all schemas from lib/validations/ for backward compatibility.
 * The canonical location for schemas is lib/validations/ (per-module files).
 * This file exists only so any future imports from "@/lib/validation" still work.
 */

export * from "@/lib/validations/customer";
export * from "@/lib/validations/policy";
export * from "@/lib/validations/lead";
export * from "@/lib/validations/commission";
export * from "@/lib/validations/attendance";
export * from "@/lib/validations/renewal";
export * from "@/lib/validations/premium";
export * from "@/lib/validations/document";
export * from "@/lib/validations/settings";

// Re-export common schemas from the legacy schemas.ts
// These cover payment, business case, and other general schemas
export {
  emailSchema,
  phoneSchema,
  panSchema,
  gstSchema,
  aadhaarSchema,
  pincodeSchema,
  dateSchema,
  currencySchema,
  percentageSchema,
  createCustomerSchema,
  updateCustomerSchema,
  policyTypeSchema,
  policyStatusSchema,
  createPolicySchema,
  updatePolicySchema,
  claimStatusSchema,
  createClaimSchema,
  updateClaimSchema,
  caseTypeSchema,
  caseStatusSchema,
  lobSchema,
  prioritySchema,
  createBusinessCaseSchema,
  updateBusinessCaseSchema,
  fileUploadSchema,
  userRoleSchema,
  createUserSchema,
  updateUserSchema,
  attendanceStatusSchema,
  createAttendanceSchema,
  updateAttendanceSchema,
  paymentMethodSchema,
  paymentStatusSchema,
  createPaymentSchema,
  updatePaymentSchema,
  schemas,
} from "./schemas";
