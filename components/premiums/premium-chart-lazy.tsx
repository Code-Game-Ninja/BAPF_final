"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ChartLoader = () => (
  <div className="w-full h-[300px] flex items-center justify-center">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

export const PremiumChart = dynamic(
  () => import("@/components/premiums/premium-chart").then((m) => ({ default: m.PremiumChart })),
  { loading: ChartLoader, ssr: false }
);
