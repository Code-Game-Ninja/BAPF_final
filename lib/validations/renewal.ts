import { z } from "zod";

export const RENEWAL_STATUSES = [
  { value: "due", label: "Due", color: "#EEAE9D" },
  { value: "contacted", label: "Contacted", color: "#60a5fa" },
  { value: "renewed", label: "Renewed", color: "#4ade80" },
  { value: "lost", label: "Lost", color: "#f87171" },
] as const;

/**
 * Schema for updating a renewal's status + notes
 */
export const renewalUpdateSchema = z.object({
  status: z.enum(["due", "contacted", "renewed", "lost"], {
    message: "Renewal status is required",
  }),
  notes: z
    .string()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type RenewalUpdateFormData = z.infer<typeof renewalUpdateSchema>;

/**
 * Schema for bulk-creating renewals
 */
export const bulkRenewalSchema = z.object({
  daysAhead: z
    .number({ message: "Days ahead is required" })
    .min(1, "Must be at least 1 day")
    .max(365, "Cannot exceed 365 days"),
});

export type BulkRenewalFormData = z.infer<typeof bulkRenewalSchema>;

/**
 * Schema for WhatsApp reminder
 */
export const whatsappReminderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(10, "Valid phone number required"),
  policyNumber: z.string().min(1, "Policy number is required"),
  dueDate: z.string().min(1, "Due date is required"),
  premiumAmount: z.number().optional(),
  customMessage: z
    .string()
    .max(1000, "Message must be under 1000 characters")
    .optional(),
});

export type WhatsAppReminderFormData = z.infer<typeof whatsappReminderSchema>;

/**
 * Schema for renewal window configuration
 */
export const renewalConfigSchema = z.object({
  default_window_days: z
    .number()
    .min(1, "Window must be at least 1 day")
    .max(365, "Window cannot exceed 365 days"),
  per_type: z.record(z.string(), z.number().min(1).max(365)).optional(),
});

export type RenewalConfigData = z.infer<typeof renewalConfigSchema>;
