"use client";
import useSWR from "swr";
import { claimService } from "@/lib/services/claim.service";

export function useClaims(filters?: Parameters<typeof claimService.list>[0]) {
  return useSWR(["claims", filters], () => claimService.list(filters), { revalidateOnFocus: false });
}

export function useClaim(id: string | null) {
  return useSWR(id ? ["claim", id] : null, () => claimService.getById(id!), { revalidateOnFocus: false });
}

export function useClaimTimeline(claimId: string | null) {
  return useSWR(claimId ? ["claim-timeline", claimId] : null, () => claimService.getTimeline(claimId!), { revalidateOnFocus: false });
}

export function useClaimDocuments(claimId: string | null) {
  return useSWR(claimId ? ["claim-documents", claimId] : null, () => claimService.getDocuments(claimId!), { revalidateOnFocus: false });
}

export function useClaimStats() {
  return useSWR("claim-stats", () => claimService.getClaimStats(), { revalidateOnFocus: false });
}
