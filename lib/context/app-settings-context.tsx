"use client";

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { useSettings } from "@/lib/hooks/use-settings";
import { setMaxFileSizeMB } from "@/lib/helpers/storage";
import { setCurrency, setDateFormat } from "../utils/index";
import { setSessionTimeoutMinutes } from "@/lib/context/auth-context";
import { setWhatsAppCompanyName } from "@/lib/helpers/whatsapp";

// ---- Types ----
// Keys MUST match exactly what the Settings page writes to the settings table.

export interface AppSettings {
  // General
  company_name: string;
  company_email: string;
  company_phone: string;
  currency: string;
  date_format: string;
  timezone: string;
  financial_year_start: string;

  // Policy
  policy_number_prefix: string;
  auto_generate_policy_number: boolean;
  renewal_reminder_days: number;
  policy_expiry_warning_days: number;

  // Attendance
  office_start_time: string;
  office_end_time: string;
  late_threshold_minutes: number;
  full_day_hours: number;
  half_day_hours: number;
  early_checkout_enabled: boolean;
  auto_checkout_time: string;
  working_days: string;

  // Branches
  default_branch: string;
  multi_branch_enabled: boolean;

  // Notifications
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  daily_summary_email: boolean;
  notification_retention_days: number;

  // Commissions
  default_commission_rate: number;
  commission_payout_day: number;
  commission_calculation_mode: string;

  // Holidays
  auto_mark_holiday_absent: boolean;
  carry_forward_leaves: boolean;

  // Security
  session_timeout_minutes: number;
  max_login_attempts: number;
  password_min_length: number;
  enforce_2fa: boolean;
  max_file_size_mb: number;

  // Dropdowns
  policy_types: string;
  payment_modes: string;
  relation_types: string;

  // Company Templates
  welcome_message: string;
  policy_email_template: string;
  renewal_email_template: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  // General — aligned with settings.service.ts seed values
  company_name: "BAPF Insurance",
  company_email: "admin@bpaf.com",
  company_phone: "+92-300-0000000",
  currency: "PKR",
  date_format: "DD/MM/YYYY",
  timezone: "Asia/Karachi",
  financial_year_start: "01-07",

  // Policy
  policy_number_prefix: "POL",
  auto_generate_policy_number: true,
  renewal_reminder_days: 30,
  policy_expiry_warning_days: 60,

  // Attendance
  office_start_time: "09:00",
  office_end_time: "18:00",
  late_threshold_minutes: 15,
  full_day_hours: 8,
  half_day_hours: 4,
  early_checkout_enabled: true,
  auto_checkout_time: "20:00",
  working_days: "Mon,Tue,Wed,Thu,Fri,Sat",

  // Branches
  default_branch: "main",
  multi_branch_enabled: true,

  // Notifications
  push_notifications_enabled: true,
  email_notifications_enabled: true,
  daily_summary_email: false,
  notification_retention_days: 90,

  // Commissions
  default_commission_rate: 10,
  commission_payout_day: 1,
  commission_calculation_mode: "premium_based",

  // Holidays
  auto_mark_holiday_absent: false,
  carry_forward_leaves: false,

  // Security
  session_timeout_minutes: 60,
  max_login_attempts: 5,
  password_min_length: 6,
  enforce_2fa: false,
  max_file_size_mb: 50,

  // Dropdowns
  policy_types: "Life,Health,Motor,Property,Travel,Fire,Marine,Liability",
  payment_modes: "Cash,Cheque,Bank Transfer,Online,Credit Card",
  relation_types: "Self,Spouse,Child,Parent,Sibling,Other",

  // Company Templates
  welcome_message: "Welcome to BAPF Insurance Management System",
  policy_email_template: "Dear {customer_name}, your policy {policy_number} has been issued successfully.",
  renewal_email_template: "Dear {customer_name}, your policy {policy_number} is due for renewal on {expiry_date}.",
};

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  getSetting: <K extends keyof AppSettings>(key: K) => AppSettings[K];
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  getSetting: (key) => DEFAULT_SETTINGS[key],
});

// ---- Parse helpers ----

function toBool(val: unknown, fallback: boolean): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val === "true";
  return fallback;
}

function toNum(val: unknown, fallback: number): number {
  if (typeof val === "number") return val;
  const n = parseFloat(String(val));
  return isNaN(n) ? fallback : n;
}

function toStr(val: unknown, fallback: string): string {
  if (typeof val === "string" && val.length > 0) return val;
  return fallback;
}

// ---- Provider ----

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { data: rawSettings, isLoading } = useSettings();

  const settings = useMemo<AppSettings>(() => {
    if (!rawSettings || rawSettings.length === 0) return DEFAULT_SETTINGS;

    // Build a key→value lookup from settings rows
    const map: Record<string, unknown> = {};
    for (const s of rawSettings) {
      map[s.key] = s.value;
    }

    return {
      // General
      company_name: toStr(map.company_name, DEFAULT_SETTINGS.company_name),
      company_email: toStr(map.company_email, DEFAULT_SETTINGS.company_email),
      company_phone: toStr(map.company_phone, DEFAULT_SETTINGS.company_phone),
      currency: toStr(map.currency, DEFAULT_SETTINGS.currency),
      date_format: toStr(map.date_format, DEFAULT_SETTINGS.date_format),
      timezone: toStr(map.timezone, DEFAULT_SETTINGS.timezone),
      financial_year_start: toStr(map.financial_year_start, DEFAULT_SETTINGS.financial_year_start),

      // Policy
      policy_number_prefix: toStr(map.policy_number_prefix, DEFAULT_SETTINGS.policy_number_prefix),
      auto_generate_policy_number: toBool(map.auto_generate_policy_number, DEFAULT_SETTINGS.auto_generate_policy_number),
      renewal_reminder_days: toNum(map.renewal_reminder_days, DEFAULT_SETTINGS.renewal_reminder_days),
      policy_expiry_warning_days: toNum(map.policy_expiry_warning_days, DEFAULT_SETTINGS.policy_expiry_warning_days),

      // Attendance
      office_start_time: toStr(map.office_start_time, DEFAULT_SETTINGS.office_start_time),
      office_end_time: toStr(map.office_end_time, DEFAULT_SETTINGS.office_end_time),
      late_threshold_minutes: toNum(map.late_threshold_minutes, DEFAULT_SETTINGS.late_threshold_minutes),
      full_day_hours: toNum(map.full_day_hours, DEFAULT_SETTINGS.full_day_hours),
      half_day_hours: toNum(map.half_day_hours, DEFAULT_SETTINGS.half_day_hours),
      early_checkout_enabled: toBool(map.early_checkout_enabled, DEFAULT_SETTINGS.early_checkout_enabled),
      auto_checkout_time: toStr(map.auto_checkout_time, DEFAULT_SETTINGS.auto_checkout_time),
      working_days: toStr(map.working_days, DEFAULT_SETTINGS.working_days),

      // Branches
      default_branch: toStr(map.default_branch, DEFAULT_SETTINGS.default_branch),
      multi_branch_enabled: toBool(map.multi_branch_enabled, DEFAULT_SETTINGS.multi_branch_enabled),

      // Notifications
      push_notifications_enabled: toBool(map.push_notifications_enabled, DEFAULT_SETTINGS.push_notifications_enabled),
      email_notifications_enabled: toBool(map.email_notifications_enabled, DEFAULT_SETTINGS.email_notifications_enabled),
      daily_summary_email: toBool(map.daily_summary_email, DEFAULT_SETTINGS.daily_summary_email),
      notification_retention_days: toNum(map.notification_retention_days, DEFAULT_SETTINGS.notification_retention_days),

      // Commissions
      default_commission_rate: toNum(map.default_commission_rate, DEFAULT_SETTINGS.default_commission_rate),
      commission_payout_day: toNum(map.commission_payout_day, DEFAULT_SETTINGS.commission_payout_day),
      commission_calculation_mode: toStr(map.commission_calculation_mode, DEFAULT_SETTINGS.commission_calculation_mode),

      // Holidays
      auto_mark_holiday_absent: toBool(map.auto_mark_holiday_absent, DEFAULT_SETTINGS.auto_mark_holiday_absent),
      carry_forward_leaves: toBool(map.carry_forward_leaves, DEFAULT_SETTINGS.carry_forward_leaves),

      // Security
      session_timeout_minutes: toNum(map.session_timeout_minutes, DEFAULT_SETTINGS.session_timeout_minutes),
      max_login_attempts: toNum(map.max_login_attempts, DEFAULT_SETTINGS.max_login_attempts),
      password_min_length: toNum(map.password_min_length, DEFAULT_SETTINGS.password_min_length),
      enforce_2fa: toBool(map.enforce_2fa, DEFAULT_SETTINGS.enforce_2fa),
      max_file_size_mb: toNum(map.max_file_size_mb, DEFAULT_SETTINGS.max_file_size_mb),

      // Dropdowns
      policy_types: toStr(map.policy_types, DEFAULT_SETTINGS.policy_types),
      payment_modes: toStr(map.payment_modes, DEFAULT_SETTINGS.payment_modes),
      relation_types: toStr(map.relation_types, DEFAULT_SETTINGS.relation_types),

      // Company Templates
      welcome_message: toStr(map.welcome_message, DEFAULT_SETTINGS.welcome_message),
      policy_email_template: toStr(map.policy_email_template, DEFAULT_SETTINGS.policy_email_template),
      renewal_email_template: toStr(map.renewal_email_template, DEFAULT_SETTINGS.renewal_email_template),
    };
  }, [rawSettings]);

  // Apply side effects when settings change
  useEffect(() => {
    setMaxFileSizeMB(settings.max_file_size_mb);
    setCurrency(settings.currency);
    setDateFormat(settings.date_format);
    setSessionTimeoutMinutes(settings.session_timeout_minutes);
    setWhatsAppCompanyName(settings.company_name);
  }, [settings]);

  const value = useMemo<AppSettingsContextType>(() => ({
    settings,
    loading: isLoading,
    getSetting: (key) => settings[key],
  }), [settings, isLoading]);

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

// ---- Hook ----

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
