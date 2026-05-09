import { z } from "zod";

// ---- Attendance Status Config ----

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present", color: "#4ade80", icon: "check" },
  { value: "absent", label: "Absent", color: "#f87171", icon: "x" },
  { value: "half-day", label: "Half Day", color: "#fbbf24", icon: "clock" },
  { value: "late", label: "Late", color: "#fb923c", icon: "alert" },
  { value: "leave", label: "Leave", color: "#60a5fa", icon: "calendar" },
] as const;

/**
 * Schema for overriding attendance status (admin/manager)
 */
export const attendanceOverrideSchema = z.object({
  status: z.enum(["present", "absent", "half-day", "late", "leave"], {
    message: "Status is required",
  }),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason must be under 500 characters"),
});

export type AttendanceOverrideFormData = z.infer<
  typeof attendanceOverrideSchema
>;

/**
 * Schema for marking leave/absent for a user
 */
export const markLeaveSchema = z.object({
  user_id: z.string().min(1, "User is required"),
  user_name: z.string().min(1, "User name is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["absent", "leave"], { message: "Status is required" }),
  reason: z
    .string()
    .max(500, "Reason must be under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type MarkLeaveFormData = z.infer<typeof markLeaveSchema>;

/**
 * Schema for creating a holiday
 */
export const holidaySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  date: z.string().min(1, "Date is required"),
  isRecurring: z.boolean(),
});

export type HolidayFormData = z.infer<typeof holidaySchema>;

/**
 * Schema for attendance notifications
 */
export const attendanceNotificationSchema = z.object({
  type: z.enum(["late_checkin", "absent_reminder", "early_checkout"]),
  user_id: z.string().uuid("Invalid user ID"),
  message: z.string().max(500).optional(),
  attendance_id: z.string().uuid().optional(),
  checkout_time: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export type AttendanceNotificationData = z.infer<typeof attendanceNotificationSchema>;
