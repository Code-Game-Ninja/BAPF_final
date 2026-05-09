/**
 * Supabase Settings / System Config Service
 */

import { supabase } from "@/lib/supabase/client";
import { SystemConfig } from "@/lib/types";

const TABLE = "system_config";

export async function getAllSettings(): Promise<SystemConfig[]> {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as SystemConfig[];
}

export async function getSettingsByCategory(category: string): Promise<SystemConfig[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("category", category);
  if (error) throw new Error(error.message);
  return (data ?? []) as SystemConfig[];
}

export async function getValue<V = unknown>(key: string): Promise<V | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", key)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ? (data.value as V) : null;
}

export async function setValue(key: string, value: unknown): Promise<void> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select();
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error(`Setting not found: ${key}`);
}

export async function upsertSetting(
  key: string,
  value: unknown,
  category: string,
  description?: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      key,
      value,
      category,
      description,
      updated_at: now,
    }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function updateSetting(id: string, data: Partial<SystemConfig>): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSetting(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Default settings blueprint ─────────────────────────────────────────────
export interface DefaultSetting {
  key: string;
  value: string;
  category: string;
  description: string;
}

export const DEFAULT_SETTINGS: DefaultSetting[] = [
  // ── General ──
  { key: "company_name", value: "BAPF Insurance", category: "general", description: "Company display name" },
  { key: "company_email", value: "admin@bpaf.com", category: "general", description: "Primary contact email" },
  { key: "company_phone", value: "+92-300-0000000", category: "general", description: "Primary contact phone" },
  { key: "currency", value: "PKR", category: "general", description: "Default currency code" },
  { key: "date_format", value: "DD/MM/YYYY", category: "general", description: "Date display format" },
  { key: "timezone", value: "Asia/Karachi", category: "general", description: "System timezone" },
  { key: "financial_year_start", value: "01-07", category: "general", description: "Financial year start (MM-DD)" },

  // ── Policy ──
  { key: "policy_number_prefix", value: "POL", category: "policy", description: "Prefix for auto-generated policy numbers" },
  { key: "renewal_reminder_days", value: "30", category: "policy", description: "Days before expiry to send renewal reminders" },
  { key: "policy_expiry_warning_days", value: "60", category: "policy", description: "Days before expiry to show warnings" },
  { key: "auto_generate_policy_number", value: "true", category: "policy", description: "Automatically generate policy numbers" },

  // ── Proposals ──
  { key: "proposal_prefix", value: "PRP", category: "proposals", description: "Prefix for auto-generated proposal numbers (e.g. PRP-00001)" },
  { key: "proposal_validity_days", value: "30", category: "proposals", description: "Default validity period for new proposals (days)" },

  // ── Claims ──
  { key: "claim_sla_days", value: "14", category: "claims", description: "Target SLA for claim settlement (days)" },

  // ── Invoices ──
  { key: "invoice_prefix", value: "INV", category: "invoices", description: "Prefix for auto-generated invoice numbers" },
  { key: "default_invoice_due_days", value: "15", category: "invoices", description: "Default payment terms (days until due)" },

  // ── KYC ──
  { key: "auto_verify_kyc_low_risk", value: "false", category: "kyc", description: "Automatically verify low-risk KYC documents" },

  // ── Attendance ──
  { key: "office_start_time", value: "09:00", category: "attendance", description: "Office opening time (HH:mm)" },
  { key: "office_end_time", value: "18:00", category: "attendance", description: "Office closing time (HH:mm)" },
  { key: "late_threshold_minutes", value: "15", category: "attendance", description: "Minutes after start time before marking late" },
  { key: "half_day_hours", value: "4", category: "attendance", description: "Minimum hours for a half day" },
  { key: "full_day_hours", value: "8", category: "attendance", description: "Expected hours for a full day" },
  { key: "early_checkout_enabled", value: "true", category: "attendance", description: "Allow employees to request early checkout" },
  { key: "auto_checkout_time", value: "20:00", category: "attendance", description: "Auto-checkout employees still checked in at this time" },
  { key: "working_days", value: "Mon,Tue,Wed,Thu,Fri,Sat", category: "attendance", description: "Working days of the week (comma-separated)" },

  // ── Branches ──
  { key: "default_branch", value: "main", category: "branches", description: "Default branch for new users and policies" },
  { key: "multi_branch_enabled", value: "true", category: "branches", description: "Enable multi-branch operations" },

  // ── Notifications ──
  { key: "email_notifications_enabled", value: "true", category: "notifications", description: "Send email notifications" },
  { key: "push_notifications_enabled", value: "true", category: "notifications", description: "Enable in-app push notifications" },
  { key: "notification_retention_days", value: "90", category: "notifications", description: "Days to keep old notifications" },
  { key: "daily_summary_email", value: "false", category: "notifications", description: "Send daily summary email to admin" },

  // ── Commissions ──
  { key: "default_commission_rate", value: "10", category: "commissions", description: "Default commission percentage for new policies" },
  { key: "commission_payout_day", value: "1", category: "commissions", description: "Day of month for commission payouts" },
  { key: "commission_calculation_mode", value: "premium_based", category: "commissions", description: "How commissions are calculated (premium_based / flat)" },

  // ── Holidays ──
  { key: "auto_mark_holiday_absent", value: "false", category: "holidays", description: "Auto-mark holiday attendance as 'holiday'" },
  { key: "carry_forward_leaves", value: "false", category: "holidays", description: "Allow carrying forward unused leaves" },

  // ── Security ──
  { key: "session_timeout_minutes", value: "60", category: "security", description: "Minutes of inactivity before auto-logout" },
  { key: "max_login_attempts", value: "5", category: "security", description: "Max failed login attempts before lockout" },
  { key: "password_min_length", value: "6", category: "security", description: "Minimum password length" },
  { key: "enforce_2fa", value: "false", category: "security", description: "Require two-factor authentication" },

  // ── Dropdowns ──
  { key: "policy_types", value: "Life,Health,Motor,Property,Travel,Fire,Marine,Liability", category: "dropdowns", description: "Available policy type options (comma-separated)" },
  { key: "payment_modes", value: "Cash,Cheque,Bank Transfer,Online,Credit Card", category: "dropdowns", description: "Available payment mode options (comma-separated)" },
  { key: "relation_types", value: "Self,Spouse,Child,Parent,Sibling,Other", category: "dropdowns", description: "Available relation type options (comma-separated)" },

  // ── Company Templates ──
  { key: "policy_email_template", value: "Dear {customer_name}, your policy {policy_number} has been issued successfully.", category: "company_templates", description: "Template for policy issuance email" },
  { key: "renewal_email_template", value: "Dear {customer_name}, your policy {policy_number} is due for renewal on {expiry_date}.", category: "company_templates", description: "Template for renewal reminder email" },
  { key: "welcome_message", value: "Welcome to BAPF Insurance Management System", category: "company_templates", description: "Dashboard welcome message" },
];

/**
 * Seed all default settings that don't already exist.
 * Returns count of newly created settings.
 */
export async function seedDefaults(): Promise<number> {
  const existing = await getAllSettings();
  const existingKeys = new Set(existing.map((s) => s.key));
  const now = new Date().toISOString();
  const toInsert = DEFAULT_SETTINGS
    .filter((s) => !existingKeys.has(s.key))
    .map((s) => ({
      key: s.key,
      value: s.value,
      category: s.category,
      description: s.description,
      created_at: now,
      updated_at: now,
    }));
  if (toInsert.length > 0) {
    const { error } = await supabase.from(TABLE).insert(toInsert);
    if (error) throw new Error(error.message);
  }
  return toInsert.length;
}

// Backward-compatible service wrapper
export const settingsService = {
  getAllSettings,
  getAll: getAllSettings,
  getByCategory: getSettingsByCategory,
  getValue,
  setValue,
  upsert: upsertSetting,
  update: updateSetting,
  delete: deleteSetting,
  seedDefaults,
  DEFAULT_SETTINGS,
};
