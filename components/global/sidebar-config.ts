import { LayoutDashboard } from "lucide-react";
import { Inbox } from "lucide-react";
import { Users } from "lucide-react";
import { FileText } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { ShieldAlert } from "lucide-react"; // Re-added to fix Turbopack HMR stalemate
import { Receipt } from "lucide-react";
import { BarChart3 } from "lucide-react";
import { Settings } from "lucide-react";
import { UsersRound } from "lucide-react";
import { Shield } from "lucide-react";
import { GitBranch } from "lucide-react";
import { CalendarClock } from "lucide-react";
import { DollarSign } from "lucide-react";
import { UserSquare2 } from "lucide-react";
import { Ticket } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { Target } from "lucide-react";
import { FileBox } from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  children?: { label: string; href: string; roles?: UserRole[] }[];
}

export const menuItems: MenuItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "employee"],
  },
  {
    label: "Intake Desk",
    href: "/dashboard/intake",
    icon: Inbox,
    roles: ["admin", "manager", "employee"],
  },
  {
    label: "Business Cases",
    href: "/dashboard/business-cases",
    icon: GitBranch,
    roles: ["admin", "manager", "employee"],
  },
  {
    label: "Customer Master",
    href: "/dashboard/customers",
    icon: Users,
    roles: ["admin", "manager", "employee"],
    children: [
      { label: "All Entities", href: "/dashboard/customers" },
      { label: "Bulk Onboarding", href: "/dashboard/customers/bulk" },
      { label: "KYC Center", href: "/dashboard/kyc" },
      { label: "Access Control", href: "/dashboard/customers/credentials", roles: ["admin"] },
    ],
  },
  {
    label: "Policies & Products",
    href: "/dashboard/policies",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
    children: [
      { label: "Policy Register", href: "/dashboard/policies" },
      { label: "Proposals / Quotes", href: "/dashboard/proposals" },
      { label: "Renewal Pipeline", href: "/dashboard/renewals" },
      { label: "Premium Ledger", href: "/dashboard/premiums", roles: ["admin", "manager"] },
      { label: "Endorsements", href: "/dashboard/endorsements" },
    ],
  },
  {
    label: "Service Desk",
    href: "/dashboard/service-desk",
    icon: ShieldCheck,
    roles: ["admin", "manager", "employee"],
    children: [
      { label: "Ticket Queue", href: "/dashboard/service-desk" },
      { label: "New Ticket", href: "/dashboard/service-desk/new" },
      { label: "Metrics", href: "/dashboard/service-desk/metrics" },
      { label: "Templates", href: "/dashboard/service-desk/templates", roles: ["admin", "manager"] },
      { label: "Settings", href: "/dashboard/service-desk/settings", roles: ["admin"] },
      { label: "Claims Center", href: "/dashboard/claims" },
    ],
  },
  {
    label: "Finance & Commissions",
    href: "/dashboard/invoices",
    icon: Receipt,
    roles: ["admin", "manager"],
    children: [
      { label: "Billing & Invoices", href: "/dashboard/invoices" },
      { label: "Commission Ledger", href: "/dashboard/invoices/ledger", roles: ["admin"] },
    ],
  },
  {
    label: "Growth & Intelligence",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["admin", "manager"],
    children: [
      { label: "Sales Leads", href: "/dashboard/sales-leads" },
      { label: "Campaign Manager", href: "/dashboard/campaigns" },
      { label: "Business Analytics", href: "/dashboard/reports" },
      { label: "IRDA Compliance", href: "/dashboard/irda" },
      { label: "Performance Matrix", href: "/dashboard/performance" },
    ],
  },
  {
    label: "Internal Ops",
    href: "/dashboard/team",
    icon: Shield,
    roles: ["admin", "manager"],
    children: [
      { label: "Team Management", href: "/dashboard/team" },
      { label: "Attendance Log", href: "/dashboard/attendance" },
      { label: "Audit Trails", href: "/dashboard/audit-logs" },
      { label: "SOP Library", href: "/dashboard/sop" },
      { label: "Document Vault", href: "/dashboard/documents" },
    ],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["admin"],
  },
];
