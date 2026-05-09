import { z } from "zod";

/**
 * Schema for SLA configuration
 */
export const slaConfigSchema = z.object({
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  sla_hours: z.number().positive("SLA hours must be a positive number"),
});

export type SLAConfigData = z.infer<typeof slaConfigSchema>;

/**
 * Schema for business hours configuration
 */
export const businessHoursSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format (HH:mm)"),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format (HH:mm)"),
  is_working_day: z.boolean().default(true),
});

export type BusinessHoursData = z.infer<typeof businessHoursSchema>;
