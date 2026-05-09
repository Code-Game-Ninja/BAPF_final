"use client";
import useSWR from "swr";
import { performanceService } from "@/lib/services/performance.service";

export function useEmployeePerformance(filters?: Parameters<typeof performanceService.getEmployeePerformance>[0]) {
  return useSWR(["employee-performance", filters], () => performanceService.getEmployeePerformance(filters), { revalidateOnFocus: false });
}

export function useTeamHierarchy() {
  return useSWR("team-hierarchy", () => performanceService.getTeamHierarchy(), { revalidateOnFocus: false });
}

export function usePersistencyRatio(filters?: Parameters<typeof performanceService.getPersistencyRatio>[0]) {
  return useSWR(["persistency-ratio", filters], () => performanceService.getPersistencyRatio(filters), { revalidateOnFocus: false });
}

export function useMonthlyBusinessAnalytics() {
  return useSWR("monthly-business", () => performanceService.getMonthlyBusinessAnalytics(), { revalidateOnFocus: false });
}
