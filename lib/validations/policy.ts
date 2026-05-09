import { z } from "zod";

// ── Default (hardcoded) policy types — used as fallback when settings not loaded ──
export const POLICY_TYPES = [
  { value: "motor", label: "Motor Insurance" },
  { value: "health", label: "Health Insurance" },
  { value: "life", label: "Life Insurance" },
  { value: "fire", label: "Fire Insurance" },
  { value: "marine", label: "Marine Insurance" },
  { value: "burglary", label: "Burglary Insurance" },
  { value: "liability", label: "Liability Insurance" },
  { value: "workmen_compensation", label: "Workmen Compensation" },
  { value: "car_ear", label: "CAR / EAR" },
  { value: "surety_bond", label: "Surety Bond" },
  { value: "travel", label: "Travel Insurance" },
  { value: "other", label: "Other" },
] as const;

/**
 * Parse a comma-separated settings string into a {value, label}[] array.
 * Falls back to POLICY_TYPES if the string is empty/invalid.
 */
export function parsePolicyTypes(csv: string | undefined): { value: string; label: string }[] {
  if (!csv || !csv.trim()) return [...POLICY_TYPES];
  const items = csv.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return [...POLICY_TYPES];
  return items.map((label) => ({ value: label.toLowerCase().replace(/\s+/g, "_"), label }));
}

/** Parse a comma-separated settings string into a {value, label}[] array for payment modes. */
export function parsePaymentModes(csv: string | undefined): { value: string; label: string }[] {
  const fallback = [
    { value: "cash", label: "Cash" },
    { value: "cheque", label: "Cheque" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "online", label: "Online" },
  ];
  if (!csv || !csv.trim()) return fallback;
  const items = csv.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return fallback;
  return items.map((label) => ({ value: label.toLowerCase().replace(/\s+/g, "_"), label }));
}

/** Parse a comma-separated settings string into a {value, label}[] array for relation types. */
export function parseRelationTypes(csv: string | undefined): { value: string; label: string }[] {
  const fallback = [
    { value: "self", label: "Self" },
    { value: "spouse", label: "Spouse" },
    { value: "child", label: "Child" },
    { value: "parent", label: "Parent" },
    { value: "sibling", label: "Sibling" },
  ];
  if (!csv || !csv.trim()) return fallback;
  const items = csv.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return fallback;
  return items.map((label) => ({ value: label.toLowerCase().replace(/\s+/g, "_"), label }));
}

export const PAYMENT_FREQUENCIES = [
  { value: "annual", label: "Annual" },
  { value: "semi-annual", label: "Semi-Annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
  { value: "single", label: "Single Premium" },
] as const;

export const POLICY_STATUSES = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
] as const;

export const SUPPORTED_INSURERS = [
  "Bajaj Allianz",
  "ICICI Lombard",
  "HDFC Ergo",
  "TATA AIG",
  "LIC",
  "New India Assurance",
  "Star Health",
  "SBI General",
  "Reliance General",
  "United India",
  "Oriental Insurance",
  "National Insurance",
  "Cholamandalam MS",
  "Royal Sundaram",
  "Kotak Mahindra",
  "Max Life",
  "HDFC Life",
  "ICICI Prudential",
  "Aditya Birla",
  "Care Health",
  "Niva Bupa",
  "Other",
];

/**
 * Zod schema for manual policy creation/editing
 */
export const policySchema = z.object({
  policy_number: z
    .string()
    .optional()
    .or(z.literal("")),
  policy_type: z.enum([
    "motor", "health", "life", "fire", "marine", "burglary",
    "liability", "workmen_compensation", "car_ear", "surety_bond",
    "travel", "other",
  ] as const, { error: "Policy type is required" }),
  customer_id: z
    .string()
    .min(1, "Customer is required"),
  customer_name: z
    .string()
    .min(1, "Customer name is required"),
  start_date: z
    .string()
    .min(1, "Start date is required"),
  end_date: z
    .string()
    .min(1, "End date is required"),
  premium_amount: z
    .number({ error: "Premium amount is required" })
    .positive("Premium must be positive"),
  sum_insured: z
    .number()
    .positive("Sum insured must be positive")
    .optional()
    .or(z.literal(0)),
  insurer_name: z
    .string()
    .optional()
    .or(z.literal("")),
  payment_frequency: z
    .enum(["annual", "semi-annual", "quarterly", "monthly", "single"])
    .optional(),
  assigned_to: z
    .string()
    .min(1, "Assigned employee is required"),
  assigned_to_name: z
    .string()
    .optional(),
  remark: z
    .string()
    .max(500, "Remark must be under 500 characters")
    .optional()
    .or(z.literal("")),
  branch_id: z
    .string()
    .optional()
    .or(z.literal("")),
  campaign_id: z
    .string()
    .optional()
    .or(z.literal("")),

  // ── Policy-type-specific fields ──
  motor_category: z.enum(["retail", "fleet"]).optional(),
  vehicle_number: z.string().optional().or(z.literal("")),
  vehicle_type: z.string().optional().or(z.literal("")),
  health_policy_type: z.enum(["single", "floater"]).optional(),
  plan_name: z.string().optional().or(z.literal("")),
  life_plan_type: z.enum(["endowment", "term_plan", "ulip", "moneyback"]).optional(),
  risk_location: z.string().optional().or(z.literal("")),
  marine_policy_type: z.enum(["single_transit", "open_import", "open_export", "stop"]).optional(),
  liability_type: z.enum(["public", "product"]).optional(),
  policy_tenure: z.string().optional().or(z.literal("")),
  project_name: z.string().optional().or(z.literal("")),
  project_location: z.string().optional().or(z.literal("")),
  principal: z.string().optional().or(z.literal("")),
  surety_bond_type: z.enum(["bid_bond", "performance_bond", "mobilisation_bond", "retention_bond"]).optional(),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) > new Date(data.start_date);
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["end_date"],
  }
);

export type PolicyFormData = z.infer<typeof policySchema>;

/**
 * Schema for the employee verification popup
 */
export const verificationSchema = z.object({
  policyNumberCorrect: z.literal(true, {
    error: "Must confirm policy number",
  }),
  datesCorrect: z.literal(true, {
    error: "Must confirm dates",
  }),
  premiumCorrect: z.literal(true, {
    error: "Must confirm premium amount",
  }),
  customerCorrect: z.literal(true, {
    error: "Must confirm customer details",
  }),
  finalConfirmation: z.literal(true, {
    error: "Must give final confirmation",
  }),
});

export type VerificationFormData = z.infer<typeof verificationSchema>;

/**
 * Schema for bulk CSV import row
 */
export const csvPolicyRowSchema = z.object({
  policy_number: z.string().optional(),
  policy_type: z.string().min(1, "Policy type required"),
  customer_name: z.string().min(1, "Customer name required"),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  premium_amount: z.string().min(1, "Premium required"),
  sum_insured: z.string().optional(),
  insurer_name: z.string().optional(),
  payment_frequency: z.string().optional(),
});

export type CSVPolicyRow = z.infer<typeof csvPolicyRowSchema>;
