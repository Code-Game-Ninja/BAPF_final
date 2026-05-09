"use client";
import useSWR from "swr";
import { endorsementService } from "@/lib/services/endorsement.service";

export function useEndorsements(filters?: Parameters<typeof endorsementService.list>[0]) {
  return useSWR(["endorsements", filters], () => endorsementService.list(filters), { revalidateOnFocus: false });
}

export function useEndorsement(id: string | null) {
  return useSWR(id ? ["endorsement", id] : null, () => endorsementService.getById(id!), { revalidateOnFocus: false });
}
