"use client";

import { motion } from "framer-motion";
import {
  Inbox, Clock, Pause, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, Timer, ShieldAlert,
} from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/helpers/animations";

interface MetricsBarProps {
  statusCounts: Record<string, number>;
  overdueCount: number;
  slaOnTimeRate: number;
  avgResolutionMinutes: number;
  breachCount: number;
  isLoading?: boolean;
}

export function TicketMetricsBar({
  statusCounts,
  overdueCount,
  slaOnTimeRate,
  avgResolutionMinutes,
  breachCount,
  isLoading,
}: MetricsBarProps) {
  const formatResolutionTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const metrics = [
    {
      label: "Open",
      value: statusCounts.open ?? 0,
      icon: Inbox,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "In Progress",
      value: statusCounts.in_progress ?? 0,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Pending",
      value: statusCounts.pending ?? 0,
      icon: Pause,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Overdue",
      value: overdueCount,
      icon: AlertTriangle,
      color: overdueCount > 0 ? "text-red-400" : "text-muted-foreground",
      bg: overdueCount > 0 ? "bg-red-500/10" : "bg-muted/30",
    },
    {
      label: "Resolved",
      value: statusCounts.resolved ?? 0,
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Closed",
      value: statusCounts.closed ?? 0,
      icon: XCircle,
      color: "text-gray-400",
      bg: "bg-gray-500/10",
    },
  ];

  const slaMetrics = [
    {
      label: "SLA On-Time",
      value: `${slaOnTimeRate}%`,
      icon: TrendingUp,
      color: slaOnTimeRate >= 80 ? "text-green-400" : slaOnTimeRate >= 60 ? "text-amber-400" : "text-red-400",
    },
    {
      label: "Avg Resolution",
      value: formatResolutionTime(avgResolutionMinutes),
      icon: Timer,
      color: "text-blue-400",
    },
    {
      label: "SLA Breaches",
      value: breachCount,
      icon: ShieldAlert,
      color: breachCount > 0 ? "text-red-400" : "text-green-400",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Status metrics */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 sm:grid-cols-6 gap-2"
      >
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div
            key={label}
            variants={staggerItem}
            className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider truncate">
                {label}
              </p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>
              {isLoading ? "—" : value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* SLA metrics */}
      <div className="grid grid-cols-3 gap-2">
        {slaMetrics.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
          >
            <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-lg font-bold ${color}`}>
                {isLoading ? "—" : value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
