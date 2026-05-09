"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePremiumMonthlySummary } from "@/lib/hooks/use-premiums";
import { chartTheme, chartStatusColors } from "@/lib/helpers/chart-theme";

interface PremiumChartProps {
  year?: number;
}

export function PremiumChart({ year }: PremiumChartProps) {
  const currentYear = year || new Date().getFullYear();
  const { data, isLoading } = usePremiumMonthlySummary(currentYear);

  const chartData = useMemo(() => {
    if (!data) return [];

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return data.map((item, index) => ({
      month: monthNames[index] || String(item.month),
      collected: item.collected,
      pending: item.pending,
      count: item.count,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="bg-card border-secondary">
        <CardHeader>
          <Skeleton className="h-5 w-48 bg-secondary" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full bg-secondary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-secondary">
      <CardHeader>
        <CardTitle className="text-foreground text-base">
          Premium Collection — {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis dataKey="month" stroke={chartTheme.axis} fontSize={12} />
            <YAxis stroke={chartTheme.axis} fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border-strong)",
                borderRadius: "8px",
                color: "var(--foreground)",
              }}
              formatter={(value) =>
                `₹${Number(value).toLocaleString("en-IN")}`
              }
            />
            <Legend />
            <Bar
              dataKey="collected"
              fill={chartStatusColors.success}
              name="Collected (₹)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
