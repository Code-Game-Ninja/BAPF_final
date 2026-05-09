"use client";
import { cn } from "@/lib/utils";

import Link from "next/link";
import { AlertTriangle, RefreshCw, DollarSign, LifeBuoy, FileSearch, ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OverdueData {
  overdueRenewals: { id: string }[];
  overduePremiums: { id: string }[];
}

interface OverdueAlertsProps {
  overdue: any;
  stats: any;
}

export function OverdueAlerts({ overdue, stats }: OverdueAlertsProps) {
  const alerts = [
    {
      id: "renewals",
      label: "Overdue Renewals",
      count: overdue?.overdueRenewals?.length || stats?.overdueRenewals || 0,
      icon: RefreshCw,
      href: "/dashboard/renewals?filter=overdue",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20"
    },
    {
      id: "premiums",
      label: "Overdue Premiums",
      count: overdue?.overduePremiums?.length || stats?.premiumOverdue || 0,
      icon: DollarSign,
      href: "/dashboard/premiums?filter=overdue",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      id: "claims",
      label: "Pending Claims",
      count: stats?.pendingClaims || 0,
      icon: ShieldAlert,
      href: "/dashboard/service-desk/claims?status=pending",
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20"
    },
    {
      id: "tickets",
      label: "Open Tickets",
      count: stats?.pendingTickets || 0,
      icon: LifeBuoy,
      href: "/dashboard/service-desk/tickets?status=open",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      id: "docs",
      label: "Missing Documents",
      count: stats?.missingDocs || 0,
      icon: FileSearch,
      href: "/dashboard/documents?filter=missing",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    }
  ].filter(a => a.count > 0);

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 rounded-[2rem] border-2 border-dashed border-border/40 bg-card/20 group hover:bg-card/30 transition-all">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <ShieldAlert className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-bold text-foreground">Operational Perfection</p>
        <p className="text-xs text-muted-foreground mt-1">No critical tasks or overdue items requiring attention.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {alerts.map((alert) => (
        <Link key={alert.id} href={alert.href}>
          <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl border bg-card/40 backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-card active:scale-[0.98]",
            alert.border
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", alert.bg)}>
                <alert.icon className={cn("h-5 w-5", alert.color)} />
              </div>
              <span className="text-sm font-bold tracking-tight">{alert.label}</span>
            </div>
            <Badge variant="outline" className={cn("h-7 px-2.5 font-black text-xs border-none", alert.bg, alert.color)}>
              {alert.count}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
