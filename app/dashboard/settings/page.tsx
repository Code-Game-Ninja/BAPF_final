"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsService } from "@/lib/services/settings.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { friendlyError } from "@/lib/helpers/friendly-error";
import {
  useSettings,
  invalidateSettings,
} from "@/lib/hooks/use-settings";
import { SETTINGS_CATEGORIES } from "@/lib/validations/settings";
import { DEFAULT_SETTINGS } from "@/lib/services/settings.service";
import {
  Settings,
  Loader2,
  Shield,
  Save,
  Building2,
  Lock,
  Bell,
  FileText,
  CalendarDays,
  GitBranch,
  CalendarHeart,
  ListFilter,
  Stamp,
  DatabaseZap,
  RotateCcw,
  Briefcase,
  Stethoscope,
  Receipt,
  ShieldCheck,
  Sparkles,
  Hash,
} from "lucide-react";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

// ─── Field type definitions ────────────────────────────────────────
type FieldType = "text" | "email" | "number" | "time" | "select" | "switch" | "textarea" | "multi-check";

interface SettingFieldDef {
  key: string;
  label: string;
  type: FieldType;
  description: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  suffix?: string;
}

// ─── Category field schemas ────────────────────────────────────────

const CATEGORY_FIELDS: Record<string, SettingFieldDef[]> = {
  general: [
    { key: "company_name", label: "Company Name", type: "text", description: "Your company display name shown across the system", placeholder: "e.g. BAPF Insurance" },
    { key: "company_email", label: "Company Email", type: "email", description: "Primary contact email for company communications", placeholder: "admin@company.com" },
    { key: "company_phone", label: "Company Phone", type: "text", description: "Primary contact phone number", placeholder: "+92-300-0000000" },
    { key: "currency", label: "Currency", type: "select", description: "Default currency used for premiums and commissions", options: [
      { label: "PKR – Pakistani Rupee", value: "PKR" },
      { label: "USD – US Dollar", value: "USD" },
      { label: "EUR – Euro", value: "EUR" },
      { label: "GBP – British Pound", value: "GBP" },
      { label: "AED – UAE Dirham", value: "AED" },
      { label: "SAR – Saudi Riyal", value: "SAR" },
      { label: "INR – Indian Rupee", value: "INR" },
    ]},
    { key: "date_format", label: "Date Format", type: "select", description: "How dates are displayed throughout the application", options: [
      { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
      { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
      { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
      { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
    ]},
    { key: "timezone", label: "Timezone", type: "select", description: "System timezone for attendance, reports, and scheduling", options: [
      { label: "Asia/Karachi (PKT +5)", value: "Asia/Karachi" },
      { label: "Asia/Dubai (GST +4)", value: "Asia/Dubai" },
      { label: "Asia/Kolkata (IST +5:30)", value: "Asia/Kolkata" },
      { label: "Asia/Riyadh (AST +3)", value: "Asia/Riyadh" },
      { label: "Europe/London (GMT +0)", value: "Europe/London" },
      { label: "America/New_York (EST -5)", value: "America/New_York" },
    ]},
    { key: "financial_year_start", label: "Financial Year Start", type: "text", description: "Start of the financial year in MM-DD format", placeholder: "01-07" },
  ],

  policy: [
    { key: "policy_number_prefix", label: "Policy Number Prefix", type: "text", description: "Prefix added to auto-generated policy numbers (e.g. POL-00001)", placeholder: "POL" },
    { key: "auto_generate_policy_number", label: "Auto-Generate Policy Numbers", type: "switch", description: "Automatically assign sequential policy numbers when creating new policies" },
    { key: "renewal_reminder_days", label: "Renewal Reminder (Days)", type: "number", description: "How many days before expiry to send renewal reminder notifications", min: 1, max: 365, suffix: "days" },
    { key: "policy_expiry_warning_days", label: "Expiry Warning (Days)", type: "number", description: "How many days before expiry to start showing warning indicators", min: 1, max: 365, suffix: "days" },
  ],

  proposals: [
    { key: "proposal_prefix", label: "Proposal Prefix", type: "text", description: "Prefix added to auto-generated proposal numbers (e.g. PRP-00001)", placeholder: "PRP" },
    { key: "proposal_validity_days", label: "Proposal Validity", type: "number", description: "How long new proposals remain valid before expiring", min: 1, max: 365, suffix: "days" },
  ],

  claims: [
    { key: "claim_sla_days", label: "Claim SLA Target", type: "number", description: "Target number of days for resolving and settling claims", min: 1, max: 90, suffix: "days" },
  ],

  invoices: [
    { key: "invoice_prefix", label: "Invoice Prefix", type: "text", description: "Prefix added to auto-generated invoices (e.g. INV-00001)", placeholder: "INV" },
    { key: "default_invoice_due_days", label: "Default Payment Terms", type: "number", description: "Default number of days until invoices are marked overdue", min: 0, max: 90, suffix: "days" },
  ],

  kyc: [
    { key: "auto_verify_kyc_low_risk", label: "Auto-Verify Low Risk", type: "switch", description: "Automatically verify incoming KYC documents that meet low-risk criteria" },
  ],

  attendance: [
    { key: "office_start_time", label: "Office Start Time", type: "time", description: "Official office opening time — employees checking in after this + late threshold are marked late" },
    { key: "office_end_time", label: "Office End Time", type: "time", description: "Official office closing time — used for auto-checkout and work-hour calculations" },
    { key: "late_threshold_minutes", label: "Late Threshold", type: "number", description: "Grace period in minutes after office start before marking attendance as late", min: 0, max: 120, suffix: "minutes" },
    { key: "full_day_hours", label: "Full Day Hours", type: "number", description: "Minimum hours required for a full working day", min: 1, max: 24, suffix: "hours" },
    { key: "half_day_hours", label: "Half Day Hours", type: "number", description: "Minimum hours required for a half day", min: 1, max: 12, suffix: "hours" },
    { key: "early_checkout_enabled", label: "Allow Early Checkout Requests", type: "switch", description: "Let employees submit early checkout requests for admin/manager approval" },
    { key: "auto_checkout_time", label: "Auto-Checkout Time", type: "time", description: "Automatically check out employees who are still checked in at this time" },
    { key: "working_days", label: "Working Days", type: "multi-check", description: "Select which days of the week are working days", options: [
      { label: "Monday", value: "Mon" },
      { label: "Tuesday", value: "Tue" },
      { label: "Wednesday", value: "Wed" },
      { label: "Thursday", value: "Thu" },
      { label: "Friday", value: "Fri" },
      { label: "Saturday", value: "Sat" },
      { label: "Sunday", value: "Sun" },
    ]},
  ],

  branches: [
    { key: "default_branch", label: "Default Branch", type: "text", description: "Default branch assigned to new users and policies", placeholder: "main" },
    { key: "multi_branch_enabled", label: "Multi-Branch Mode", type: "switch", description: "Enable operations across multiple branches — users see only their branch data" },
  ],

  notifications: [
    { key: "push_notifications_enabled", label: "In-App Notifications", type: "switch", description: "Show real-time in-app push notifications for important events" },
    { key: "email_notifications_enabled", label: "Email Notifications", type: "switch", description: "Send email notifications for policy expiry, renewals, and system alerts" },
    { key: "daily_summary_email", label: "Daily Summary Email", type: "switch", description: "Send a daily digest email to admin with attendance and policy summaries" },
    { key: "notification_retention_days", label: "Notification Retention", type: "number", description: "How many days to keep old notifications before cleanup", min: 7, max: 365, suffix: "days" },
  ],

  // commissions: [ -- temporarily disabled
  //   { key: "default_commission_rate", ... },
  //   { key: "commission_payout_day", ... },
  //   { key: "commission_calculation_mode", ... },
  // ],

  holidays: [
    { key: "auto_mark_holiday_absent", label: "Auto-Mark Holidays", type: "switch", description: "Automatically mark attendance as 'Holiday' on public holidays" },
    { key: "carry_forward_leaves", label: "Carry Forward Leaves", type: "switch", description: "Allow employees to carry forward unused annual leaves to the next year" },
  ],

  security: [
    { key: "session_timeout_minutes", label: "Session Timeout", type: "number", description: "Automatically log out users after this many minutes of inactivity", min: 5, max: 480, suffix: "minutes" },
    { key: "max_login_attempts", label: "Max Login Attempts", type: "number", description: "Lock out account after this many consecutive failed login attempts", min: 3, max: 20, suffix: "attempts" },
    { key: "password_min_length", label: "Minimum Password Length", type: "number", description: "Minimum number of characters required for user passwords", min: 4, max: 32, suffix: "characters" },
    { key: "enforce_2fa", label: "Enforce Two-Factor Auth", type: "switch", description: "Require all users to enable two-factor authentication for login" },
  ],

  dropdowns: [
    { key: "policy_types", label: "Policy Types", type: "textarea", description: "Comma-separated list of policy types shown in dropdown menus (e.g. Life, Health, Motor)" },
    { key: "payment_modes", label: "Payment Modes", type: "textarea", description: "Comma-separated list of payment modes (e.g. Cash, Cheque, Bank Transfer, Online)" },
    { key: "relation_types", label: "Relation Types", type: "textarea", description: "Comma-separated list of relation types for nominees (e.g. Self, Spouse, Child, Parent)" },
  ],

  company_templates: [
    { key: "welcome_message", label: "Dashboard Welcome Message", type: "textarea", description: "Welcome text shown on the main dashboard for all users" },
    { key: "policy_email_template", label: "Policy Issuance Email Template", type: "textarea", description: "Email template sent when a new policy is issued. Use {customer_name}, {policy_number} as placeholders." },
    { key: "renewal_email_template", label: "Renewal Reminder Email Template", type: "textarea", description: "Email template for renewal reminders. Use {customer_name}, {policy_number}, {expiry_date} as placeholders." },
  ],
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  general: "Company information, branding, currency, and regional defaults",
  policy: "Policy numbering, renewal alerts, and expiry warning thresholds",
  proposals: "Quotation and proposal settings, including validity periods",
  claims: "Service Level Agreements (SLAs) and claim assignment rules",
  invoices: "Financial settings, invoice generation, and payment terms",
  kyc: "Document verification rules and compliance settings",
  attendance: "Office hours, late marking, checkout rules, and working days",
  branches: "Branch management and multi-branch configuration",
  notifications: "Notification channels, retention, and delivery preferences",
  // commissions: "Commission rates, payout schedule, and calculation rules", -- temporarily disabled
  holidays: "Holiday attendance marking and leave carry-forward rules",
  security: "Session management, login security, and authentication rules",
  dropdowns: "Configurable dropdown options used in forms across the system",
  company_templates: "Email templates, welcome messages, and communication content",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  general: Building2,
  policy: FileText,
  proposals: Briefcase,
  claims: Stethoscope,
  invoices: Receipt,
  kyc: ShieldCheck,
  attendance: CalendarDays,
  branches: GitBranch,
  notifications: Bell,
  // commissions: Wallet, -- temporarily disabled
  holidays: CalendarHeart,
  security: Lock,
  dropdowns: ListFilter,
  company_templates: Stamp,
};

// ─── CategoryForm – renders a dedicated form for one category ──────

function CategoryForm({
  category,
  fields,
  settingsMap,
  dbUser,
}: {
  category: string;
  fields: SettingFieldDef[];
  settingsMap: Record<string, string>;
  dbUser: { id: string; uid?: string; name?: string };
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync form state from database
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] = settingsMap[f.key] ?? "";
    }
    setFormValues(init);
    setDirty(false);
  }, [settingsMap, fields]);

  const updateField = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const changed: string[] = [];
      for (const f of fields) {
        const newVal = formValues[f.key] ?? "";
        const oldVal = settingsMap[f.key] ?? "";
        if (newVal !== oldVal) {
          await settingsService.upsert(f.key, newVal, category, f.description);
          changed.push(f.label);
        }
      }
      if (changed.length === 0) {
        toast.info("No changes to save");
        return;
      }
      toast.success(`Saved ${changed.length} setting${changed.length > 1 ? "s" : ""}`);
      invalidateSettings();
      auditLogService.logAction(
        dbUser.uid || dbUser.id, dbUser.name || "", "config_change", "settings",
        `Updated ${category} settings: ${changed.join(", ")}`
      ).catch(() => {});
      setDirty(false);
    } catch (err) {
      toast.error(friendlyError(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] = settingsMap[f.key] ?? "";
    }
    setFormValues(init);
    setDirty(false);
  };

  return (
    <div className="space-y-6">
      {fields.map((field, idx) => (
        <div key={field.key}>
          {idx > 0 && <Separator className="mb-6 bg-border-strong/50" />}
          <FieldRenderer
            field={field}
            value={formValues[field.key] ?? ""}
            onChange={(val) => updateField(field.key, val)}
          />
        </div>
      ))}

      {/* Save / Reset buttons */}
      <Separator className="bg-border-strong/50" />
      <div className="flex items-center justify-end gap-3 pt-2">
        {dirty && (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="min-w-30 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ─── FieldRenderer – renders appropriate input per field type ───────

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: SettingFieldDef;
  value: string;
  onChange: (val: string) => void;
}) {
  const inputCls = "bg-background border-border-strong text-foreground";

  switch (field.type) {
    case "text":
    case "email":
      return (
        <div className="grid gap-2">
          <Label className="text-foreground font-medium">{field.label}</Label>
          <p className="text-muted-foreground text-sm -mt-1">{field.description}</p>
          <Input
            type={field.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${inputCls} w-full sm:max-w-md`}
          />
        </div>
      );

    case "number":
      return (
        <div className="grid gap-2">
          <Label className="text-foreground font-medium">{field.label}</Label>
          <p className="text-muted-foreground text-sm -mt-1">{field.description}</p>
          <div className="flex items-center gap-2 w-full sm:max-w-xs">
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              min={field.min}
              max={field.max}
              className={inputCls}
            />
            {field.suffix && (
              <span className="text-muted-foreground text-sm whitespace-nowrap">{field.suffix}</span>
            )}
          </div>
        </div>
      );

    case "time":
      return (
        <div className="grid gap-2">
          <Label className="text-foreground font-medium">{field.label}</Label>
          <p className="text-muted-foreground text-sm -mt-1">{field.description}</p>
          <Input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} w-full sm:max-w-45`}
          />
        </div>
      );

    case "select":
      return (
        <div className="grid gap-2">
          <Label className="text-foreground font-medium">{field.label}</Label>
          <p className="text-muted-foreground text-sm -mt-1">{field.description}</p>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={`${inputCls} w-full sm:max-w-md`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {(field.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-foreground">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "switch":
      return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full sm:max-w-lg rounded-lg border border-border-strong p-4">
          <div className="space-y-0.5">
            <Label className="text-foreground font-medium">{field.label}</Label>
            <p className="text-muted-foreground text-sm">{field.description}</p>
          </div>
          <Switch
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          />
        </div>
      );

    case "textarea":
      return (
        <div className="grid gap-2">
          <Label className="text-foreground font-medium">{field.label}</Label>
          <p className="text-muted-foreground text-sm -mt-1">{field.description}</p>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={`${inputCls} w-full sm:max-w-xl`}
          />
        </div>
      );

    case "multi-check": {
      const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const toggle = (v: string) => {
        const next = selected.includes(v)
          ? selected.filter((s) => s !== v)
          : [...selected, v];
        onChange(next.join(","));
      };
      return (
        <div className="grid gap-2">
          <Label className="text-foreground font-medium">{field.label}</Label>
          <p className="text-muted-foreground text-sm -mt-1">{field.description}</p>
          <div className="flex flex-wrap gap-4 mt-1">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                />
                <span className="text-foreground text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Main page ─────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user: dbUser, loading: authLoading } = useAuth();
  const { data: settings, isLoading } = useSettings();

  const [tab, setTab] = useState("general");
  const [seeding, setSeeding] = useState(false);

  // Build key→value map for quick field lookup
  const settingsMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of settings || []) {
      m[s.key] = String(s.value ?? "");
    }
    return m;
  }, [settings]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dbUser || dbUser.role !== "admin") {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  const onSeedDefaults = async () => {
    try {
      setSeeding(true);
      const count = await settingsService.seedDefaults();
      if (count > 0) {
        toast.success(`Initialized ${count} default settings`);
        invalidateSettings();
        auditLogService.logAction(
          dbUser.uid || dbUser.id, dbUser.name || "", "config_change", "settings",
          `Seeded ${count} default settings`
        ).catch(() => {});
      } else {
        toast.info("All default settings already exist");
      }
    } catch (err) {
      toast.error(friendlyError(err, "Failed to initialize defaults"));
    } finally {
      setSeeding(false);
    }
  };

  // Count how many settings exist per category
  const catCounts: Record<string, number> = {};
  for (const cat of SETTINGS_CATEGORIES) {
    catCounts[cat.value] = (settings || []).filter((s) => s.category === cat.value).length;
  }

  const configuredCount = (settings || []).length;
  const expectedDefaults = DEFAULT_SETTINGS.length;
  const missingDefaults = Math.max(expectedDefaults - configuredCount, 0);
  const coverage = expectedDefaults > 0
    ? Math.min(Math.round((configuredCount / expectedDefaults) * 100), 100)
    : 0;
  const categoryCount = SETTINGS_CATEGORIES.length;
  const showInitDefaults = !isLoading && configuredCount < expectedDefaults;

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Platform governance
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-[0.16em] sm:text-3xl">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              System configuration and preferences that apply across all users and workflows.
            </p>
          </div>

          {showInitDefaults && (
            <motion.div {...hoverLift}>
              <Button
                size="sm"
                variant="outline"
                className="border-border/80 bg-background/80 text-foreground hover:bg-muted/60"
                disabled={seeding}
                onClick={onSeedDefaults}
              >
                {seeding ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <DatabaseZap className="mr-1.5 h-4 w-4" />
                )}
                Initialize Defaults
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            icon: Hash,
            label: "Categories",
            value: categoryCount,
            panel: "border-blue-500/30 bg-blue-500/10",
            text: "text-blue-700 dark:text-blue-300",
          },
          {
            icon: Settings,
            label: "Configured",
            value: configuredCount,
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            icon: DatabaseZap,
            label: "Defaults Missing",
            value: missingDefaults,
            panel: "border-amber-500/30 bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-300",
          },
          {
            icon: Shield,
            label: "Coverage",
            value: `${coverage}%`,
            panel: "border-violet-500/30 bg-violet-500/10",
            text: "text-violet-700 dark:text-violet-300",
          },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <Card className={item.panel}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className={`mt-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                    <item.icon className={`h-4 w-4 ${item.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        {/* Mobile: Dropdown selector */}
        <div className="sm:hidden mb-4">
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="w-full rounded-2xl border-border-strong/70 bg-card">
              <SelectValue>
                {(() => {
                  const Icon = CATEGORY_ICONS[tab] || Settings;
                  const cat = SETTINGS_CATEGORIES.find((c) => c.value === tab);
                  return (
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {cat?.label || tab}
                    </span>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-border bg-popover">
              {SETTINGS_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c.value] || Settings;
                return (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {c.label}
                      {catCounts[c.value] > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-5 text-xs bg-skeleton text-foreground">
                          {catCounts[c.value]}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tab list */}
        <TabsList className="hidden sm:flex sm:!h-auto w-full flex-wrap content-start items-start justify-start gap-1 rounded-2xl border border-border-strong/70 bg-card p-1">
          {SETTINGS_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.value] || Settings;
            return (
              <TabsTrigger
                key={c.value}
                value={c.value}
                className="h-9 flex-none px-3 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {c.label}
                {catCounts[c.value] > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 text-xs bg-skeleton text-foreground">
                    {catCounts[c.value]}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SETTINGS_CATEGORIES.map((c) => {
          const fields = CATEGORY_FIELDS[c.value] || [];
          return (
            <TabsContent key={c.value} value={c.value}>
              <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg">
                    {c.label} Settings
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {CATEGORY_DESCRIPTIONS[c.value] || ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : fields.length === 0 ? (
                    <div className="text-center py-12">
                      <Settings className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No fields defined for {c.label.toLowerCase()}
                      </p>
                    </div>
                  ) : (
                    <CategoryForm
                      category={c.value}
                      fields={fields}
                      settingsMap={settingsMap}
                      dbUser={dbUser}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </motion.div>
  );
}
