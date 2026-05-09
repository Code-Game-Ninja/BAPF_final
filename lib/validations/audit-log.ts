import { AuditAction } from "@/lib/types";

// ---- Action Type Config ----

export const AUDIT_ACTIONS: {
  value: AuditAction;
  label: string;
  color: string;
  icon: string; // lucide icon name reference
}[] = [
  { value: "create", label: "Create", color: "#10b981", icon: "plus-circle" },
  { value: "update", label: "Update", color: "#3b82f6", icon: "pencil" },
  { value: "delete", label: "Delete", color: "#ef4444", icon: "trash-2" },
  { value: "login", label: "Login", color: "#8b5cf6", icon: "log-in" },
  { value: "logout", label: "Logout", color: "#6b7280", icon: "log-out" },
  { value: "pdf_upload", label: "PDF Upload", color: "#f59e0b", icon: "file-up" },
  { value: "bulk_import", label: "Bulk Import", color: "#06b6d4", icon: "database" },
  { value: "config_change", label: "Config Change", color: "#ec4899", icon: "settings" },
  { value: "password_change", label: "Password Change", color: "#f97316", icon: "key" },
];

// ---- Module Config ----

export const AUDIT_MODULES = [
  { value: "auth", label: "Authentication" },
  { value: "customer", label: "Customers" },
  { value: "policy", label: "Policies" },
  { value: "renewal", label: "Renewals" },
  { value: "premium", label: "Premiums" },
  { value: "commission", label: "Commissions" },
  { value: "attendance", label: "Attendance" },
  { value: "document", label: "Documents" },
  { value: "notification", label: "Notifications" },
  { value: "settings", label: "Settings" },
  { value: "user", label: "Users" },
];

export function getActionConfig(action: string) {
  return AUDIT_ACTIONS.find((a) => a.value === action);
}

export function getModuleLabel(module: string) {
  return AUDIT_MODULES.find((m) => m.value === module)?.label || module;
}
