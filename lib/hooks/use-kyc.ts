"use client";
import useSWR from "swr";
import { kycService } from "@/lib/services/kyc.service";

export function useKYCDocuments(customerId: string | null) {
  return useSWR(customerId ? ["kyc-documents", customerId] : null, () => kycService.listByCustomer(customerId!), { revalidateOnFocus: false });
}

export function useKYCStatus(customerId: string | null) {
  return useSWR(customerId ? ["kyc-status", customerId] : null, () => kycService.getCustomerKYCStatus(customerId!), { revalidateOnFocus: false });
}

export function usePendingKYCCount() {
  return useSWR("pending-kyc-count", () => kycService.getPendingCount(), { revalidateOnFocus: false });
}
