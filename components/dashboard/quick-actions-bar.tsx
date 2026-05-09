"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Shield,
  Target,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hoverLift, staggerContainer, staggerItem } from "@/lib/helpers/animations";

interface QuickActionsBarProps {
  isAdmin: boolean;
}

export function QuickActionsBar({ isAdmin }: QuickActionsBarProps) {
  const quickActions = [
    {
      label: "Add Customer",
      icon: Users,
      href: "/dashboard/customers",
      color: "text-emerald-700 dark:text-emerald-300",
      chip: "border-emerald-500/35 bg-emerald-500/10",
    },
    {
      label: "New Policy",
      icon: FileText,
      href: "/dashboard/policies",
      color: "text-sky-700 dark:text-sky-300",
      chip: "border-sky-500/35 bg-sky-500/10",
    },
    {
      label: "New Lead",
      icon: Target,
      href: "/dashboard/sales-leads",
      color: "text-amber-700 dark:text-amber-300",
      chip: "border-amber-500/40 bg-amber-500/10",
    },
  ];

  // Only admin/manager can access premiums and reports
  if (isAdmin) {
    quickActions.push(
      {
        label: "Record Premium",
        icon: DollarSign,
        href: "/dashboard/premiums",
        color: "text-primary",
        chip: "border-primary/30 bg-primary/10",
      },
      {
        label: "View Reports",
        icon: BarChart3,
        href: "/dashboard/reports",
        color: "text-violet-700 dark:text-violet-300",
        chip: "border-violet-500/40 bg-violet-500/10",
      },
      {
        label: "Audit Logs",
        icon: Shield,
        href: "/dashboard/audit-logs",
        color: "text-orange-700 dark:text-orange-300",
        chip: "border-orange-500/40 bg-orange-500/10",
      },
    );
  }

  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-2 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Shortcuts
        </p>
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.div key={action.label} variants={staggerItem} {...hoverLift}>
                <Link
                  href={action.href}
                  className="group flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/55 px-3 py-2.5 text-left text-sm text-foreground/85 transition-all duration-200 hover:border-primary/35 hover:bg-card hover:text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${action.chip}`}>
                      <Icon className={`h-4 w-4 ${action.color}`} />
                    </span>
                    <span className="font-medium">{action.label}</span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
}
