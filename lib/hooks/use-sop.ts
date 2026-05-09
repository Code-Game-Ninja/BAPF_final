"use client";
import useSWR from "swr";
import { sopService } from "@/lib/services/sop.service";

export function useSOPs(filters?: Parameters<typeof sopService.list>[0]) {
  return useSWR(["sops", filters], () => sopService.list(filters), { revalidateOnFocus: false });
}

export function useSOP(id: string | null) {
  return useSWR(id ? ["sop", id] : null, () => sopService.getById(id!), { revalidateOnFocus: false });
}

export function useSOPCategories() {
  return useSWR("sop-categories", () => sopService.getCategories(), { revalidateOnFocus: false });
}
