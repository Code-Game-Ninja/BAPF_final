"use client";
import useSWR from "swr";
import { pendingDataService } from "@/lib/services/pending-data.service";

export function usePendingData() {
  return useSWR("pending-data", () => pendingDataService.getPendingDataSummary(), { revalidateOnFocus: false, refreshInterval: 60000 });
}
