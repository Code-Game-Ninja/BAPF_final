import { z } from "zod";

// ---- Commission Status Config ----

export const COMMISSION_STATUSES = [
  { value: "pending", label: "Pending", color: "#EEAE9D" },
  { value: "approved", label: "Approved", color: "#60a5fa" },
  { value: "paid", label: "Paid", color: "#4ade80" },
] as const;

// ---- Commission Type Config ----

export const COMMISSION_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat", label: "Flat Amount (₹)" },
] as const;

/**
 * Schema for creating/updating a commission rule
 */
export const commissionRuleSchema = z.object({
  policy_type: z.enum(
    ["motor", "health", "life", "fire", "marine", "liability", "travel", "other", "burglary", "workmen_compensation", "car_ear", "surety_bond"],
    { message: "Policy type is required" }
  ),
  commission_type: z.enum(["percentage", "flat"], {
    message: "Commission type is required",
  }),
  value: z
    .number({ message: "Value is required" })
    .min(0.01, "Must be greater than 0"),
  min_premium: z.number().min(0).optional(),
  max_premium: z.number().min(0).optional(),
  insurer_name: z
    .string()
    .max(100, "Insurer name must be under 100 characters")
    .optional()
    .or(z.literal("")),
});

export type CommissionRuleFormData = z.infer<typeof commissionRuleSchema>;

/**
 * Schema for updating commission status
 */
export const commissionUpdateSchema = z.object({
  status: z.enum(["pending", "approved", "paid"], {
    message: "Status is required",
  }),
});

export type CommissionUpdateFormData = z.infer<typeof commissionUpdateSchema>;

/**
 * Schema for commission rates (insurer + policy type specific)
 */
export const commissionRateSchema = z.object({
  insurer_name: z.string().min(1, "Insurer name is required").max(100),
  policy_type: z.string().min(1, "Policy type is required"),
  rate_type: z.enum(["percentage", "flat"]),
  rate_value: z.number().min(0, "Rate value must be non-negative"),
  effective_from: z.string().optional(),
  effective_to: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
}).refine(data => {
  if (data.rate_type === "percentage" && data.rate_value > 100) return false;
  return true;
}, {
  message: "Percentage rate must be between 0 and 100",
  path: ["rate_value"],
});

export type CommissionRateData = z.infer<typeof commissionRateSchema>;
