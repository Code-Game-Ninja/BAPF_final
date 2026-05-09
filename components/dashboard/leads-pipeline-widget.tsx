"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BarChart3, Users, ChevronRight } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { useLeads } from "@/lib/hooks/use-leads";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LEAD_STATUS_OPTIONS } from "@/lib/validations/lead";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hoverLift, staggerContainer, staggerItem } from "@/lib/helpers/animations";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-sky-500",
  follow_up: "bg-amber-500",
  interested: "bg-purple-500",
  meeting_done: "bg-indigo-500",
  proposal_sent: "bg-cyan-500",
  negotiation: "bg-orange-500",
  not_interested: "bg-gray-400",
  converted: "bg-emerald-500",
  lost: "bg-red-500",
};

export function LeadsPipelineWidget() {
  const router = useRouter();
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "manager";
  const { data: leads, isLoading } = useLeads();

  const stats = useMemo(() => {
    if (!leads) return null;

    const activeLeads = leads.filter(
      (l) => l.status !== "converted" && l.status !== "lost" && l.status !== "not_interested"
    );

    const pipelineValue = activeLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);

    const byStatus: Record<string, number> = {};
    for (const l of leads) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    }

    const bySalesperson: Record<string, { name: string; count: number }> = {};
    for (const l of activeLeads) {
      const key = l.assigned_to;
      if (!bySalesperson[key]) {
        bySalesperson[key] = { name: l.assigned_to_name || "Unknown", count: 0 };
      }
      bySalesperson[key].count++;
    }
    const topSalespersons = Object.values(bySalesperson)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const convertedCount = byStatus["converted"] ?? 0;
    const lostCount = byStatus["lost"] ?? 0;
    const totalClosed = convertedCount + lostCount;
    const conversionRate = totalClosed > 0 ? Math.round((convertedCount / totalClosed) * 100) : 0;

    return {
      total: leads.length,
      active: activeLeads.length,
      pipelineValue,
      byStatus,
      topSalespersons,
      convertedCount,
      lostCount,
      conversionRate,
    };
  }, [leads]);

  if (isLoading) {
    return (
      <Card className="border border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) return null;

  const maxStatus = Math.max(...Object.values(stats.byStatus), 1);

  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <button
          onClick={() => router.push("/dashboard/sales-leads")}
          className="flex w-full items-center justify-between"
        >
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Lead Pipeline
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-background/55 p-2">
          <motion.div variants={staggerItem} {...hoverLift} className="rounded-lg bg-card px-2 py-1.5 text-center">
            <p className="text-lg font-semibold text-foreground">{stats.active}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active</p>
          </motion.div>
          <motion.div variants={staggerItem} {...hoverLift} className="rounded-lg bg-card px-2 py-1.5 text-center">
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{stats.conversionRate}%</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Won Rate</p>
          </motion.div>
          <motion.div variants={staggerItem} {...hoverLift} className="rounded-lg bg-card px-2 py-1.5 text-center">
            <p className="text-lg font-semibold text-primary">{formatCurrency(stats.pipelineValue)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pipeline</p>
          </motion.div>
        </motion.div>

        <div className="space-y-1.5">
        {LEAD_STATUS_OPTIONS.filter((s) => (stats.byStatus[s.value] ?? 0) > 0).map((s) => {
          const count = stats.byStatus[s.value] ?? 0;
          const pct = (count / maxStatus) * 100;
          return (
            <div key={s.value} className="flex items-center gap-2 text-xs">
              <span className="w-21 truncate text-muted-foreground">{s.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted/70">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${STATUS_COLORS[s.value] || "bg-gray-400"}`}
                />
              </div>
              <span className="w-6 text-right font-mono text-foreground">{count}</span>
            </div>
          );
        })}
        </div>

        {isAdmin && stats.topSalespersons.length > 0 && (
          <>
            <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Top Salespersons
            </h4>
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-1">
              {stats.topSalespersons.map((sp, i) => (
                <motion.div key={i} variants={staggerItem} {...hoverLift} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/55 px-2.5 py-1.5 text-xs">
                  <span className="truncate text-foreground">{sp.name}</span>
                  <span className="font-mono font-semibold text-primary">{sp.count}</span>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
