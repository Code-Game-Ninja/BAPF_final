"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  CalendarClock,
  DollarSign,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { cn } from "../../lib/utils/index";

interface StatItem {
  label: string;
  value: string | number;
  total: string;
  subValue?: string;
  subLabel?: string;
  icon: React.ElementType;
  iconClass: string;
  chipClass: string;
  accentClass?: string;
  href: string;
  alert?: boolean;
}

interface StatCardGridProps {
  stats: any;
  loading: boolean;
}

export function StatCardGrid({ stats, loading }: StatCardGridProps) {
  const statCards: StatItem[] = [
    {
      label: "Active Policies",
      value: stats?.activePolicies ?? "—",
      total: stats ? `${stats.totalPolicies} total` : "",
      subLabel: "+4 this week",
      icon: FileText,
      iconClass: "text-sky-700 dark:text-sky-300",
      chipClass: "border-sky-500/35 bg-sky-500/10",
      href: "/dashboard/policies",
    },
    {
      label: "Customers",
      value: stats?.totalCustomers ?? "—",
      total: "Verified Entities",
      subLabel: "+2 new",
      icon: Users,
      iconClass: "text-emerald-700 dark:text-emerald-300",
      chipClass: "border-emerald-500/35 bg-emerald-500/10",
      href: "/dashboard/customers",
    },
    {
      label: "Active Leads",
      value: stats?.activeLeads ?? "—",
      total: "Fresh Pipelines",
      subLabel: "3 follow-ups",
      icon: Target,
      iconClass: "text-amber-700 dark:text-amber-300",
      chipClass: "border-amber-500/40 bg-amber-500/10",
      href: "/dashboard/sales-leads",
    },
    {
      label: "Pending Renewals",
      value: stats?.pendingRenewals ?? "—",
      total: stats?.overdueRenewals ? `${stats.overdueRenewals} overdue` : "Next 30 days",
      subLabel: (stats?.overdueRenewals ?? 0) > 0 ? "URGENT" : undefined,
      icon: CalendarClock,
      iconClass: "text-orange-700 dark:text-orange-300",
      chipClass: "border-orange-500/40 bg-orange-500/10",
      accentClass: (stats?.overdueRenewals ?? 0) > 0 ? "text-rose-500 font-bold" : undefined,
      href: "/dashboard/renewals",
      alert: (stats?.overdueRenewals ?? 0) > 0,
    },
    {
      label: "Premium Collected",
      value: stats ? `₹${stats.amountCollected.toLocaleString()}` : "—",
      total: stats ? `₹${stats.amountPending.toLocaleString()} pending` : "",
      subLabel: "Reconciliation: 94%",
      icon: DollarSign,
      iconClass: "text-primary",
      chipClass: "border-primary/30 bg-primary/10",
      href: "/dashboard/premiums",
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
    >
      {statCards.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div key={item.label} variants={staggerItem}>
            <Link href={item.href}>
              <Card
                className={`group relative overflow-hidden border border-border/70 bg-card/40 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 ${
                  item.alert ? "ring-1 ring-rose-500/30 border-rose-500/20" : ""
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-0.75 bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                      {item.label}
                    </p>
                    <div
                      className={`h-10 w-10 rounded-2xl border ${item.chipClass} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`h-5 w-5 ${item.iconClass}`} />
                    </div>
                  </div>
                  {loading ? (
                    <Skeleton className="h-9 w-20 bg-skeleton" />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold tracking-tight text-foreground">
                          {item.value}
                        </p>
                        {item.subLabel && (
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md border",
                            item.alert ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-primary/10 text-primary border-primary/20"
                          )}>
                             {item.subLabel}
                          </span>
                        )}
                      </div>
                      {item.total && (
                        <p className={`text-[11px] font-medium leading-tight ${item.accentClass ?? "text-muted-foreground/60"}`}>
                          {item.total}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
