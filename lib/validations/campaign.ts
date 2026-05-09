import { z } from "zod";

// ---- Campaign Channels ----

export const CAMPAIGN_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "social", label: "Social Media" },
  { value: "print", label: "Print" },
  { value: "other", label: "Other" },
];

// ---- Campaign Status ----

export const CAMPAIGN_STATUSES = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "active", label: "Active", color: "#10b981" },
  { value: "completed", label: "Completed", color: "#3b82f6" },
];

// ---- Create Schema ----

export const createCampaignSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  channel: z.string().min(1, "Channel is required"),
  budget: z.number().min(0, "Budget must be positive"),
  status: z.enum(["draft", "active", "completed"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type CreateCampaignFormData = z.infer<typeof createCampaignSchema>;

// ---- Archive Status Config ----

export const ARCHIVE_STATUSES = [
  { value: "archived", label: "Archived", color: "#6b7280" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
  { value: "expired", label: "Expired", color: "#f59e0b" },
];

export function getArchiveStatusConfig(status: string) {
  return ARCHIVE_STATUSES.find((s) => s.value === status);
}

export function getCampaignStatusConfig(status: string) {
  return CAMPAIGN_STATUSES.find((s) => s.value === status);
}
