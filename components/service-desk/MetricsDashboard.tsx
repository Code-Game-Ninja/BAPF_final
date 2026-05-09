"use client";

import { useState } from "react";
import useSWR from "swr";
import { format, subDays } from "date-fns";
import { Download, RefreshCw, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentPerformanceTable } from "./AgentPerformanceTable";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

async function fetchMetrics(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export function MetricsDashboard() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [dateFrom, setDateFrom] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const metricsKey = token
    ? `/api/service-desk/metrics?date_from=${dateFrom}&date_to=${dateTo}`
    : null;

  const { data: metrics, isLoading, mutate } = useSWR(
    metricsKey,
    (url: string) => fetchMetrics(url, token),
    { revalidateOnFocus: false }
  );

  const handleExportCSV = () => {
    if (!metrics) return;

    const rows = [
      ["Metric", "Value"],
      ["Total Tickets", metrics.total],
      ["Open", metrics.status_counts?.open ?? 0],
      ["In Progress", metrics.status_counts?.in_progress ?? 0],
      ["Pending", metrics.status_counts?.pending ?? 0],
      ["Resolved", metrics.status_counts?.resolved ?? 0],
      ["Closed", metrics.status_counts?.closed ?? 0],
      ["Overdue", metrics.overdue_count],
      ["SLA On-Time Rate", `${metrics.sla_on_time_rate}%`],
      ["Avg Resolution Time", `${metrics.avg_resolution_minutes} min`],
      ["SLA Breaches", metrics.breach_count],
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-desk-metrics-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Metrics exported");
  };

  // Prepare chart data
  const volumeTrendData = metrics?.volume_trend ?? [];

  const categoryData = Object.entries(metrics?.category_breakdown ?? {}).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value: value as number,
  }));

  const priorityData = Object.entries(metrics?.priority_breakdown ?? {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const statusData = Object.entries(metrics?.status_counts ?? {}).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value: value as number,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading font-bold uppercase tracking-wider">
            Metrics Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Volume trend chart */}
          {volumeTrendData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-4">
                Ticket Volume Trend
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={d => format(new Date(d), "dd MMM")}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category breakdown */}
            {categoryData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-4">
                  By Category
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Priority breakdown */}
            {priorityData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-4">
                  By Priority
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={priorityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Status breakdown */}
            {statusData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-4">
                  By Status
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Agent performance */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-4">
              Agent Performance
            </h3>
            <AgentPerformanceTable agents={metrics?.agent_performance ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
