"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  chartTheme,
  chartStatusColors,
} from "@/lib/helpers/chart-theme";

// ---- Color Palette ----

const COLORS = [
  "#EEAE9D",
  "#60a5fa",
  "#4ade80",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#818cf8",
  "#f472b6",
];

/** Tooltip style uses CSS var references for theme consistency */
function getTooltipStyle() {
  return {
    contentStyle: {
      backgroundColor: chartTheme.grid,
      border: `1px solid ${chartTheme.grid}`,
      borderRadius: "8px",
      color: "#F5F4F4",
      fontSize: "12px",
    },
  };
}

// ---- Reusable Chart Wrapper ----

function ChartCard({
  title,
  icon,
  loading,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card border-border-strong">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-62.5" role="status" aria-label="Loading chart">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="sr-only">Loading chart…</span>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ---- 1. Policy Type Pie ----

export function PolicyTypePieChart({
  data,
  loading,
}: {
  data?: Record<string, number>;
  loading?: boolean;
}) {
  const chartData = data
    ? Object.entries(data).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <ChartCard title="Policies by Type" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name} (${value})`}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...getTooltipStyle()} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 2. Policy Status Pie ----

export function PolicyStatusPieChart({
  data,
  loading,
}: {
  data?: Record<string, number>;
  loading?: boolean;
}) {
  const STATUS_COLORS: Record<string, string> = {
    active: "#4ade80",
    expired: "#f87171",
    cancelled: "#fbbf24",
    archived: "#5D5D5D",
  };

  const chartData = data
    ? Object.entries(data).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <ChartCard title="Policies by Status" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name} (${value})`}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip {...getTooltipStyle()} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 3. Monthly Policies Created (Bar) ----

export function MonthlyPoliciesChart({
  data,
  loading,
}: {
  data?: { month: string; count: number }[];
  loading?: boolean;
}) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <ChartCard title="Monthly Policies Created" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis dataKey="label" tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <YAxis tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <Tooltip {...getTooltipStyle()} />
          <Bar dataKey="count" fill={chartTheme.primary} radius={[4, 4, 0, 0]} name="Policies" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 4. Premium Collection (Stacked Bar) ----

export function PremiumCollectionChart({
  data,
  loading,
}: {
  data?: { month: string; collected: number; pending: number; overdue: number }[];
  loading?: boolean;
}) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <ChartCard title="Premium Collection (Monthly)" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis dataKey="label" tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <YAxis
            tick={{ fill: "#5D5D5D", fontSize: 11 }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            {...getTooltipStyle()}
            formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.legend }} />
          <Bar dataKey="collected" stackId="a" fill={chartStatusColors.success} name="Collected" />
          <Bar dataKey="pending" stackId="a" fill={chartStatusColors.warning} name="Pending" />
          <Bar dataKey="overdue" stackId="a" fill={chartStatusColors.danger} name="Overdue" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 5. Monthly Commissions (Area) ----

export function MonthlyCommissionsChart({
  data,
  loading,
}: {
  data?: { month: string; amount: number }[];
  loading?: boolean;
}) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <ChartCard title="Monthly Commission Earned" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis dataKey="label" tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <YAxis
            tick={{ fill: "#5D5D5D", fontSize: 11 }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            {...getTooltipStyle()}
            formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={chartTheme.primary}
            fill={chartTheme.primary}
            fillOpacity={0.2}
            name="Commission"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 6. Renewal Trend (Line) ----

export function RenewalTrendChart({
  data,
  loading,
}: {
  data?: { month: string; due: number; renewed: number; lost: number }[];
  loading?: boolean;
}) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <ChartCard title="Renewal Trend" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis dataKey="label" tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <YAxis tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <Tooltip {...getTooltipStyle()} />
          <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.legend }} />
          <Line type="monotone" dataKey="due" stroke={chartStatusColors.warning} name="Due" strokeWidth={2} />
          <Line type="monotone" dataKey="renewed" stroke={chartStatusColors.success} name="Renewed" strokeWidth={2} />
          <Line type="monotone" dataKey="lost" stroke={chartStatusColors.danger} name="Lost" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 7. Customer Growth (Area) ----

export function CustomerGrowthChart({
  data,
  loading,
}: {
  data?: { month: string; count: number; cumulative: number }[];
  loading?: boolean;
}) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <ChartCard title="Customer Growth" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis dataKey="label" tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <YAxis tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <Tooltip {...getTooltipStyle()} />
          <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.legend }} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={chartStatusColors.info}
            fill={chartStatusColors.info}
            fillOpacity={0.15}
            name="Total Customers"
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={chartTheme.primary}
            fill={chartTheme.primary}
            fillOpacity={0.2}
            name="New/Month"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 8. Top Insurers (Horizontal Bar) ----

export function TopInsurersChart({
  data,
  loading,
}: {
  data?: { name: string; count: number }[];
  loading?: boolean;
}) {
  return (
    <ChartCard title="Top Insurers" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data || []} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis type="number" tick={{ fill: "#5D5D5D", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#5D5D5D", fontSize: 11 }}
            width={120}
          />
          <Tooltip {...getTooltipStyle()} />
          <Bar dataKey="count" fill={chartStatusColors.purple} radius={[0, 4, 4, 0]} name="Policies" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- 9. Renewal Status Pie ----

export function RenewalStatusPieChart({
  data,
  loading,
}: {
  data?: Record<string, number>;
  loading?: boolean;
}) {
  const STATUS_COLORS: Record<string, string> = {
    due: "#fbbf24",
    contacted: "#60a5fa",
    renewed: "#4ade80",
    lost: "#f87171",
  };

  const chartData = data
    ? Object.entries(data).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <ChartCard title="Renewal Status" loading={loading}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name} (${value})`}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip {...getTooltipStyle()} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---- Helpers ----

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString("en-IN", { month: "short" });
}
