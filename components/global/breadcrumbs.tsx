"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fragment } from "react";

// ---- Route Label Map ----

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  policies: "Policies",
  renewals: "Renewals",
  premiums: "Premiums",
  commissions: "Commissions",
  attendance: "Attendance",
  documents: "Documents",
  notifications: "Notifications",
  campaigns: "Campaigns",
  reports: "Reports",
  "audit-logs": "Audit Logs",
  archives: "Archives",
  users: "User Management",
  settings: "Settings",
  profile: "Profile",
  expiry: "Expiry View",
  weekly: "Weekly View",
};

interface BreadcrumbItem {
  label: string;
  href: string;
  isLast: boolean;
}

// ---- Component ----

export function Breadcrumbs() {
  const pathname = usePathname();

  // Skip rendering on the main dashboard page
  if (pathname === "/dashboard") return null;

  // Build breadcrumb items from path segments
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;

    // Skip "dashboard" as first breadcrumb — use Home icon instead
    if (i === 0 && segment === "dashboard") continue;

    // Check if this is a dynamic segment (likely an ID)
    const isDynamic = /^[a-zA-Z0-9]{15,}$/.test(segment);
    const label = isDynamic
      ? "Details"
      : ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

    items.push({ label, href: currentPath, isLast });
  }

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="inline-flex items-center gap-1 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs font-quicksand text-muted-foreground">
        {/* Home / Dashboard */}
        <li>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider hidden sm:inline">Dashboard</span>
          </Link>
        </li>

        {items.map((item) => (
          <Fragment key={item.href}>
            <li className="flex items-center">
              <ChevronRight className="mx-1 h-3 w-3 text-muted-foreground/60" />
            </li>
            <li>
              {item.isLast ? (
                <span className={cn("font-semibold uppercase tracking-wider text-foreground")}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="uppercase tracking-wider transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
