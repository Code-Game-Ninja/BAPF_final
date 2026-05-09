import { z } from "zod";

/**
 * Zod schema for Sales Lead creation/editing
 */
export const leadSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number")
    .trim(),
  alt_mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .max(200, "Email must be under 200 characters")
    .transform((v) => v.toLowerCase().trim())
    .optional()
    .or(z.literal("")),
  source: z.enum([
    "referral",
    "walk_in",
    "online",
    "telecall",
    "social_media",
    "agent",
    "other",
  ]),
  assigned_to: z.string().uuid("Must select an employee"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z
    .enum([
      "new",
      "contacted",
      "follow_up",
      "interested",
      "meeting_done",
      "proposal_sent",
      "negotiation",
      "not_interested",
      "converted",
      "lost",
    ])
    .optional(),
  notes: z
    .string()
    .max(2000, "Notes must be under 2000 characters")
    .optional()
    .or(z.literal("")),
  follow_up_date: z.string().optional().or(z.literal("")),
  meeting_date: z.string().optional().or(z.literal("")).or(z.null()),
  poc_name: z
    .string()
    .max(100, "POC name must be under 100 characters")
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .max(150, "Location must be under 150 characters")
    .optional()
    .or(z.literal("")),
  client_type: z
    .enum(["individual", "corporate", "sme", "government", "contractor", "manufacturer", "transporter", "trader", "other"])
    .optional(),
  estimated_value: z
    .number()
    .min(0, "Estimated value cannot be negative")
    .max(99999999999999, "Value too large")
    .optional()
    .or(z.nan().transform(() => 0)),
});

export type LeadFormData = z.infer<typeof leadSchema>;

/**
 * Zod schema for updating a lead (partial — all fields optional)
 */
export const leadUpdateSchema = leadSchema.partial().extend({
  assigned_to_name: z.string().optional().or(z.literal("")),
  branch_id: z.string().uuid().optional().or(z.literal("")).or(z.null()),
  converted_customer_id: z.string().uuid().optional().or(z.null()),
  converted_at: z.string().optional().or(z.null()),
  lead_score: z.number().int().min(0).max(100).optional(),
  lead_date: z.string().optional(),
});

export type LeadUpdateData = z.infer<typeof leadUpdateSchema>;

/**
 * Zod schema for adding a note to a lead timeline
 */
export const leadNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Note cannot be empty")
    .max(2000, "Note must be under 2000 characters"),
});

export type LeadNoteFormData = z.infer<typeof leadNoteSchema>;

/**
 * Lead source labels for display
 */
export const LEAD_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "online", label: "Online" },
  { value: "telecall", label: "Telecall" },
  { value: "social_media", label: "Social Media" },
  { value: "agent", label: "Agent" },
  { value: "other", label: "Other" },
];

/**
 * Lead priority labels for display
 */
export const LEAD_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

/**
 * Lead status labels for display
 */
export const LEAD_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "interested", label: "Interested" },
  { value: "meeting_done", label: "Meeting Done" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "not_interested", label: "Not Interested" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

/**
 * Client type labels for display
 */
export const CLIENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "individual", label: "Individual / Professional" },
  { value: "corporate", label: "Corporate Office" },
  { value: "sme", label: "SME Business" },
  { value: "contractor", label: "Contractor / Infrastructure" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "transporter", label: "Transporter" },
  { value: "trader", label: "Trader" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];
