"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  IndianRupee,
  FileText,
  Download,
  Eye,
  CalendarDays,
  TrendingUp,
  Loader2,
} from "lucide-react";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usePolicies } from "@/lib/hooks/use-policies";
import { useAuth } from "@/lib/context/auth-context";
import {
  getISOWeekNumber,
  getISOWeekRange,
  getPoliciesExpiringInWeek,
  groupPoliciesByWeekday,
  formatPolicyForExport,
} from "@/lib/helpers/policy";
import { exportToCSV, exportToExcel } from "@/lib/helpers/export-report";
import { staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { EmptyState } from "@/components/global/empty-state";
import { chartTheme, chartStatusColors } from "@/lib/helpers/chart-theme";

// Dynamically import recharts (heavy chart library — code-split + SSR-disabled)
const RechartsBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
);
const RechartsBar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false }
);
const RechartsXAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const RechartsYAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const RechartsCartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const RechartsTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const RechartsResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const RechartsLegend = dynamic(
  () => import("recharts").then((mod) => mod.Legend),
  { ssr: false }
);

export default function PolicyWeeklyPage() {
  const router = useRouter();
  const { user: dbUser } = useAuth();
  const { data: rawPolicies, isLoading } = usePolicies();

  // Employee sees only their assigned policies
  const isEmployee = dbUser?.role === "employee";
  const allPolicies = useMemo(() => {
    if (!rawPolicies) return null;
    if (isEmployee && dbUser) {
      return rawPolicies.filter((p) => p.assigned_to === dbUser.uid);
    }
    return rawPolicies;
  }, [rawPolicies, isEmployee, dbUser]);
  const isPoliciesLoading = isLoading && !allPolicies;

  // Current ISO week state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [weekNumber, setWeekNumber] = useState(getISOWeekNumber(now));

  // Navigate weeks
  const goToPrevWeek = () => {
    if (weekNumber === 1) {
      setYear(year - 1);
      setWeekNumber(52);
    } else {
      setWeekNumber(weekNumber - 1);
    }
  };
  const goToNextWeek = () => {
    if (weekNumber >= 52) {
      setYear(year + 1);
      setWeekNumber(1);
    } else {
      setWeekNumber(weekNumber + 1);
    }
  };
  const goToToday = () => {
    setYear(now.getFullYear());
    setWeekNumber(getISOWeekNumber(now));
  };

  // Calculate data
  const weekRange = useMemo(() => getISOWeekRange(year, weekNumber), [year, weekNumber]);

  const weekPolicies = useMemo(() => {
    if (!allPolicies) return [];
    return getPoliciesExpiringInWeek(allPolicies, year, weekNumber);
  }, [allPolicies, year, weekNumber]);

  const weekdayBreakdown = useMemo(() => {
    if (!allPolicies) return [];
    return groupPoliciesByWeekday(allPolicies, year, weekNumber);
  }, [allPolicies, year, weekNumber]);

  // Chart data
  const chartData = useMemo(() => {
    return weekdayBreakdown.map((d) => ({
      day: d.day.slice(0, 3),
      policies: d.policies.length,
      premium: d.totalPremium,
    }));
  }, [weekdayBreakdown]);

  // Summary stats
  const totalPremium = weekPolicies.reduce((sum, p) => sum + (p.premium_amount || 0), 0);
  const daysWithExpiry = weekdayBreakdown.filter((d) => d.policies.length > 0).length;

  // Format dates
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // Export
  const handleExport = async (format: "csv" | "xlsx") => {
    if (weekPolicies.length === 0) {
      toast.info("No data to export");
      return;
    }
    const data = weekPolicies.map(formatPolicyForExport);
    const filename = `policy-weekly-W${weekNumber}-${year}`;
    const columns = Object.keys(data[0]).map((key) => ({ header: key, key }));

    if (format === "csv") {
      exportToCSV(data as Record<string, unknown>[], columns, filename);
    } else {
      await exportToExcel(data as Record<string, unknown>[], columns, filename);
    }
    toast.success(`Exported ${weekPolicies.length} policies for Week ${weekNumber}`);
  };

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* Header with Week Navigator */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider">
            Weekly Expiry View
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Policy expirations by ISO week
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevWeek}
            className="border-muted-foreground/30 text-foreground/70"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-muted-foreground/20 bg-background">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-heading text-foreground font-medium">
              W{weekNumber}, {year}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatDate(weekRange.start)} — {formatDate(weekRange.end)})
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
            className="border-muted-foreground/30 text-foreground/70"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Today
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-muted-foreground/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
                  Policies Expiring
                </p>
                <p className="text-2xl font-bold text-foreground font-heading">
                  {weekPolicies.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted-foreground/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
                  Total Premium
                </p>
                <p className="text-2xl font-bold text-foreground font-heading">
                  {formatCurrency(totalPremium)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted-foreground/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CalendarDays className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
                  Days with Expirations
                </p>
                <p className="text-2xl font-bold text-foreground font-heading">
                  {daysWithExpiry} / 7
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bar Chart */}
      {weekPolicies.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="border-muted-foreground/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-heading text-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Daily Breakdown
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("csv")}
                    className="border-muted-foreground/30 text-foreground/70 hover:bg-primary/10"
                  >
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("xlsx")}
                    className="border-muted-foreground/30 text-foreground/70 hover:bg-primary/10"
                  >
                    <Download className="w-3 h-3 mr-1" /> Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <RechartsResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData}>
                    <RechartsCartesianGrid strokeDasharray="3 3" stroke={`${chartTheme.axis}20`} />
                    <RechartsXAxis dataKey="day" stroke={chartTheme.axis} fontSize={12} />
                    <RechartsYAxis yAxisId="left" stroke={chartTheme.axis} fontSize={12} />
                    <RechartsYAxis yAxisId="right" orientation="right" stroke={chartTheme.axis} fontSize={12} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--muted-foreground, #5D5D5D)30",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                        fontSize: "12px",
                      }}
                      formatter={(value, name) => [
                        name === "premium" ? formatCurrency(Number(value || 0)) : value,
                        name === "premium" ? "Premium" : "Policies",
                      ]}
                    />
                    <RechartsLegend
                      wrapperStyle={{ fontSize: "12px", color: "var(--muted-foreground)" }}
                    />
                    <RechartsBar
                      yAxisId="left"
                      dataKey="policies"
                      fill={chartTheme.primary}
                      radius={[4, 4, 0, 0]}
                      name="Policies"
                    />
                    <RechartsBar
                      yAxisId="right"
                      dataKey="premium"
                      fill={chartStatusColors.blue}
                      radius={[4, 4, 0, 0]}
                      name="Premium (₹)"
                    />
                  </RechartsBarChart>
                </RechartsResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Daily Breakdown Tables */}
      <motion.div variants={staggerItem}>
        {isPoliciesLoading ? (
          <Card className="border-border-strong/60 bg-card/90">
            <CardContent className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading weekly expiries...
            </CardContent>
          </Card>
        ) : weekPolicies.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Expirations This Week"
            description={`No policies are expiring during Week ${weekNumber}, ${year}.`}
          />
        ) : (
          <div className="space-y-4">
            {weekdayBreakdown.map((dayData) => {
              if (dayData.policies.length === 0) return null;
              return (
                <Card key={dayData.day} className="border-muted-foreground/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-heading text-foreground uppercase tracking-wider">
                        {dayData.day} — {formatDate(dayData.date)}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs border-muted-foreground/30 text-foreground/70">
                          {dayData.policies.length} {dayData.policies.length === 1 ? "policy" : "policies"}
                        </Badge>
                        <span className="text-xs text-primary font-heading">
                          {formatCurrency(dayData.totalPremium)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-muted-foreground/20 hover:bg-transparent">
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading">Policy #</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading">Customer</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading hidden sm:table-cell">Type</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading hidden md:table-cell">Insurer</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading">Premium</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading text-right">View</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayData.policies.map((policy) => (
                          <TableRow
                            key={policy.id}
                            className="border-muted-foreground/10 hover:bg-muted-foreground/5 cursor-pointer"
                            onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                          >
                            <TableCell className="font-heading text-foreground font-medium">
                              {policy.policy_number}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {policy.customer_name}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs border-muted-foreground/30 text-foreground/70">
                                {policy.policy_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-foreground/70 hidden md:table-cell">
                              {policy.insurer_name || "-"}
                            </TableCell>
                            <TableCell>
                              <span className="text-primary font-heading text-sm">
                                {formatCurrency(policy.premium_amount || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                                className="text-foreground/60 hover:text-primary"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
