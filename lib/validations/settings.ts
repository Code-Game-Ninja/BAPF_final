import { z } from "zod";

export const baseUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "manager", "employee"]),
  phone: z.string().max(20).optional().nullable(),
  branch_id: z.string().uuid("Invalid branch ID").optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  status: z.enum(["active", "inactive"]),
});

/**
 * Factory: creates a Zod schema whose password min-length matches the admin
 * setting (password_min_length). Falls back to 6 if no value is provided.
 */
export function buildCreateUserSchema(passwordMinLength = 6) {
  return baseUserSchema.extend({
    password: z
      .string()
      .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`),
  }).omit({ status: true });
}

/** Default schema (min 6) — kept for backward-compat with imports */
export const createUserSchema = buildCreateUserSchema(6);

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = baseUserSchema;

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

/**
 * Partial schema for PATCH-style updates in the API
 */
export function buildPatchUserSchema(passwordMinLength = 6) {
  return baseUserSchema.extend({
    password: z.string().min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`).optional(),
  }).partial().strict();
}

/**
 * Factory: creates a Zod schema for editing a user.
 * Password is optional — only validated when provided.
 */
export function buildEditUserSchema(passwordMinLength = 6) {
  return z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    role: z.enum(["admin", "manager", "employee"]),
    phone: z.string().optional(),
    password: z
      .string()
      .refine(
        (val) => val === "" || val.length >= passwordMinLength,
        { message: `Password must be at least ${passwordMinLength} characters` }
      ),
  });
}

export type EditUserFormData = z.infer<ReturnType<typeof buildEditUserSchema>>;

// ---- Notification Validations ----

export const NOTIFICATION_TYPES = [
  { value: "policy_expiry", label: "Policy Expiry", color: "#ef4444" },
  { value: "renewal", label: "Renewal", color: "#f59e0b" },
  { value: "assignment", label: "Assignment", color: "#3b82f6" },
  { value: "attendance", label: "Attendance", color: "#8b5cf6" },
  { value: "commission", label: "Commission", color: "#10b981" },
  { value: "system", label: "System", color: "#6b7280" },
] as const;

export const sendNotificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum([
    "policy_expiry",
    "renewal",
    "assignment",
    "attendance",
    "commission",
    "system",
  ]),
  user_ids: z.array(z.string()).min(1, "Select at least one user"),
  link: z.string().optional(),
});

export type SendNotificationFormData = z.infer<typeof sendNotificationSchema>;

// ---- Settings Validations ----

export const SETTINGS_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "policy", label: "Policy" },
  { value: "proposals", label: "Proposals" },
  { value: "claims", label: "Claims" },
  { value: "invoices", label: "Invoices" },
  { value: "kyc", label: "KYC" },
  { value: "attendance", label: "Attendance" },
  { value: "branches", label: "Branches" },
  { value: "notifications", label: "Notifications" },
  // { value: "commissions", label: "Commissions" }, -- temporarily disabled
  { value: "holidays", label: "Holidays" },
  { value: "security", label: "Security" },
  { value: "dropdowns", label: "Dropdowns" },
  { value: "company_templates", label: "Company Templates" },
];

export const settingSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

export type SettingFormData = z.infer<typeof settingSchema>;

// ---- Role Config ----

export const ROLE_CONFIG = {
  admin: { label: "Admin", color: "#ef4444", description: "Full system access" },
  manager: { label: "Manager", color: "#f59e0b", description: "Team management" },
  employee: { label: "Employee", color: "#3b82f6", description: "Standard access" },
};

export const STATUS_CONFIG = {
  active: { label: "Active", color: "#10b981" },
  inactive: { label: "Inactive", color: "#6b7280" },
};
