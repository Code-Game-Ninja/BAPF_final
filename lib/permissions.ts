import { UserRole } from "@/lib/types";

// ---- Module Definitions ----

export type AppModule =
  | "dashboard"
  | "customers"
  | "policies"
  | "proposals"
  | "claims"
  | "endorsements"
  | "renewals"
  | "premiums"
  | "invoices"
  | "kyc"
  // | "commissions" -- temporarily disabled
  | "attendance"
  | "documents"
  | "notifications"
  | "campaigns"
  | "sales-leads"
  | "reports"
  | "irda"
  | "sop"
  | "team"
  | "performance"
  | "communications"
  | "audit-logs"
  | "archives"
  | "users"
  | "settings"
  | "profile";

export type Action = "view" | "create" | "edit" | "delete" | "export" | "restore" | "broadcast" | "approve";

// ---- Permission Matrix ----

/**
 * Defines which actions each role may perform on each module.
 */
const PERMISSIONS: Record<UserRole, Partial<Record<AppModule, Action[]>>> = {
  admin: {
    dashboard: ["view"],
    customers: ["view", "create", "edit", "delete", "export"],
    policies: ["view", "create", "edit", "delete", "export"],
    proposals: ["view", "create", "edit", "delete", "export", "approve"],
    claims: ["view", "create", "edit", "delete", "export", "approve"],
    endorsements: ["view", "create", "edit", "delete", "approve"],
    renewals: ["view", "create", "edit", "delete", "export"],
    premiums: ["view", "create", "edit", "delete", "export"],
    invoices: ["view", "create", "edit", "delete", "export"],
    kyc: ["view", "create", "edit", "delete", "approve"],
    // commissions: ["view", "create", "edit", "delete", "export"], -- temporarily disabled
    attendance: ["view", "create", "edit", "delete", "export"],
    documents: ["view", "create", "edit", "delete", "export"],
    notifications: ["view", "create", "edit", "delete", "broadcast"],
    campaigns: ["view", "create", "edit", "delete", "export"],
    "sales-leads": ["view", "create", "edit", "delete", "export"],
    reports: ["view", "export"],
    irda: ["view", "export"],
    sop: ["view", "create", "edit", "delete", "approve"],
    team: ["view", "edit"],
    performance: ["view", "export"],
    communications: ["view", "create", "edit", "delete"],
    "audit-logs": ["view", "export"],
    archives: ["view", "export"],
    users: ["view", "create", "edit", "delete"],
    settings: ["view", "edit"],
    profile: ["view", "edit"],
  },
  manager: {
    dashboard: ["view"],
    customers: ["view", "create", "edit", "export"],
    policies: ["view", "create", "edit", "export"],
    proposals: ["view", "create", "edit", "export", "approve"],
    claims: ["view", "create", "edit", "export", "approve"],
    endorsements: ["view", "create", "edit", "approve"],
    renewals: ["view", "create", "edit", "export"],
    premiums: ["view", "create", "edit", "export"],
    invoices: ["view", "create", "edit", "export"],
    kyc: ["view", "create", "edit", "approve"],
    // commissions: ["view", "create", "edit", "export"], -- temporarily disabled
    attendance: ["view", "create", "edit", "export"],
    documents: ["view", "create", "edit", "delete", "export"],
    notifications: ["view", "edit", "delete", "broadcast"],
    campaigns: ["view", "create", "edit", "export"],
    "sales-leads": ["view", "create", "edit", "export"],
    reports: ["view", "export"],
    irda: ["view", "export"],
    sop: ["view", "create", "edit", "approve"],
    team: ["view", "edit"],
    performance: ["view", "export"],
    communications: ["view", "create", "edit"],
    "audit-logs": ["view", "export"],
    archives: ["view", "export", "restore"],
    profile: ["view", "edit"],
  },
  employee: {
    dashboard: ["view"],
    customers: ["view", "create"],
    policies: ["view", "create"],
    proposals: ["view", "create", "edit"],
    claims: ["view", "create", "edit"],
    endorsements: ["view", "create"],
    renewals: ["view"],
    kyc: ["view", "create"],
    attendance: ["view", "create", "edit"],
    documents: ["view", "create"],
    notifications: ["view", "edit", "delete"],
    "sales-leads": ["view", "create", "edit"],
    sop: ["view"],
    archives: ["view"],
    profile: ["view", "edit"],
  },
};

// ---- Helper Functions ----

/**
 * Check if a role has permission to perform an action on a module.
 */
export function hasPermission(
  role: UserRole | null,
  module: AppModule,
  action: Action = "view"
): boolean {
  if (!role) return false;
  const modulePermissions = PERMISSIONS[role]?.[module];
  if (!modulePermissions) return false;
  return modulePermissions.includes(action);
}

/**
 * Get all modules accessible by a given role.
 */
export function getAccessibleModules(role: UserRole | null): AppModule[] {
  if (!role) return [];
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return [];
  return Object.keys(rolePermissions) as AppModule[];
}

/**
 * Get the filtered sidebar menu items for a given role.
 * Returns menu entries with label, href, and icon name.
 */
export interface MenuItemConfig {
  label: string;
  href: string;
  icon: string;
  children?: { label: string; href: string }[];
}

const ALL_MENU_ITEMS: (MenuItemConfig & { roles: UserRole[] })[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", roles: ["admin", "manager", "employee"] },
  { label: "Customers", href: "/dashboard/customers", icon: "Users", roles: ["admin", "manager", "employee"] },
  { label: "Proposals", href: "/dashboard/proposals", icon: "GitBranch", roles: ["admin", "manager", "employee"] },
  {
    label: "Policies",
    href: "/dashboard/policies",
    icon: "FileText",
    roles: ["admin", "manager", "employee"],
    children: [
      { label: "All Policies", href: "/dashboard/policies" },
      { label: "Expiry View", href: "/dashboard/policies/expiry" },
      { label: "Weekly View", href: "/dashboard/policies/weekly" },
      { label: "Endorsements", href: "/dashboard/endorsements" },
    ],
  },
  { label: "Claims", href: "/dashboard/claims", icon: "ShieldAlert", roles: ["admin", "manager", "employee"] },
  { label: "Renewals", href: "/dashboard/renewals", icon: "CalendarClock", roles: ["admin", "manager", "employee"] },
  { label: "Premiums", href: "/dashboard/premiums", icon: "DollarSign", roles: ["admin", "manager"] },
  { label: "Invoices", href: "/dashboard/invoices", icon: "Receipt", roles: ["admin", "manager"] },
  { label: "Attendance", href: "/dashboard/attendance", icon: "Clock", roles: ["admin", "manager", "employee"] },
  { label: "Sales Leads", href: "/dashboard/sales-leads", icon: "Target", roles: ["admin", "manager", "employee"] },
  { label: "Documents", href: "/dashboard/documents", icon: "FolderOpen", roles: ["admin", "manager", "employee"] },
  { label: "Communications", href: "/dashboard/communications", icon: "MessageSquare", roles: ["admin", "manager"] },
  { label: "Notifications", href: "/dashboard/notifications", icon: "Bell", roles: ["admin", "manager", "employee"] },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: "Megaphone", roles: ["admin", "manager"] },
  { label: "Performance", href: "/dashboard/performance", icon: "TrendingUp", roles: ["admin", "manager"] },
  { label: "Team", href: "/dashboard/team", icon: "UsersRound", roles: ["admin", "manager"] },
  { label: "Reports", href: "/dashboard/reports", icon: "BarChart3", roles: ["admin", "manager"] },
  { label: "IRDA Reports", href: "/dashboard/irda", icon: "FileSearch", roles: ["admin", "manager"] },
  { label: "SOP", href: "/dashboard/sop", icon: "BookOpen", roles: ["admin", "manager", "employee"] },
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: "Shield", roles: ["admin", "manager"] },
  { label: "Archives", href: "/dashboard/archives", icon: "Archive", roles: ["admin", "manager", "employee"] },
  { label: "User Management", href: "/dashboard/users", icon: "UserCog", roles: ["admin"] },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings", roles: ["admin"] },
];

/**
 * Get sidebar menu items filtered for a given role.
 */
export function getMenuItemsForRole(role: UserRole | null): MenuItemConfig[] {
  if (!role) return [];
  return ALL_MENU_ITEMS
    .filter((item) => item.roles.includes(role))
    .map(({ label, href, icon, children }) => ({ label, href, icon, children }));
}

/**
 * Get all allowed actions for a role on a specific module.
 */
export function getAllowedActions(role: UserRole | null, module: AppModule): Action[] {
  if (!role) return [];
  return PERMISSIONS[role]?.[module] ?? [];
}
