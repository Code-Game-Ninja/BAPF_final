"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ChartLoader = () => (
  <div className="w-full h-[300px] flex items-center justify-center">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

export const PolicyTypePieChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.PolicyTypePieChart })),
  { loading: ChartLoader, ssr: false }
);

export const PolicyStatusPieChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.PolicyStatusPieChart })),
  { loading: ChartLoader, ssr: false }
);

export const MonthlyPoliciesChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.MonthlyPoliciesChart })),
  { loading: ChartLoader, ssr: false }
);

export const PremiumCollectionChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.PremiumCollectionChart })),
  { loading: ChartLoader, ssr: false }
);

export const MonthlyCommissionsChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.MonthlyCommissionsChart })),
  { loading: ChartLoader, ssr: false }
);

export const RenewalTrendChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.RenewalTrendChart })),
  { loading: ChartLoader, ssr: false }
);

export const CustomerGrowthChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.CustomerGrowthChart })),
  { loading: ChartLoader, ssr: false }
);

export const TopInsurersChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.TopInsurersChart })),
  { loading: ChartLoader, ssr: false }
);

export const RenewalStatusPieChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.RenewalStatusPieChart })),
  { loading: ChartLoader, ssr: false }
);
