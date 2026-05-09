import { z } from "zod";

// ---- Premium Status Config ----

export const PREMIUM_STATUSES = [
  { value: "pending", label: "Pending", color: "#EEAE9D" },
  { value: "collected", label: "Collected", color: "#4ade80" },
  { value: "overdue", label: "Overdue", color: "#f87171" },
] as const;

/**
 * Schema for recording a premium payment
 */
export const premiumRecordSchema = z.object({
  policy_id: z.string().min(1, "Policy is required"),
  amount: z
    .number({ message: "Amount is required" })
    .min(1, "Amount must be greater than 0"),
  period: z.string().min(1, "Period is required"),
  status: z.enum(["pending", "collected", "overdue"], {
    message: "Status is required",
  }),
  collected_date: z.string().optional(),
  notes: z
    .string()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type PremiumRecordFormData = z.infer<typeof premiumRecordSchema>;

/**
 * Schema for updating premium status
 */
export const premiumUpdateSchema = z.object({
  status: z.enum(["pending", "collected", "overdue"], {
    message: "Status is required",
  }),
  notes: z
    .string()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type PremiumUpdateFormData = z.infer<typeof premiumUpdateSchema>;

/**
 * Schema for generating premiums for a policy
 */
export const premiumGenerateSchema = z.object({
  policy_id: z.string().min(1, "Policy is required"),
});

export type PremiumGenerateFormData = z.infer<typeof premiumGenerateSchema>;
