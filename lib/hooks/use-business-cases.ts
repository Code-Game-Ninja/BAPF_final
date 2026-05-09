"use client";
import useSWR from "swr";
import { businessCaseService } from "@/lib/services/business-case.service";

export function useBusinessCases() {
  return useSWR("business-cases", () => businessCaseService.listCases(), { revalidateOnFocus: false });
}

export function useServiceTickets() {
  return useSWR("service-tickets", () => businessCaseService.listTickets(), { revalidateOnFocus: false });
}

export function useCustomerBusinessCases(customerId: string | null) {
  return useSWR(customerId ? ["business-cases", customerId] : null, () => businessCaseService.getCasesByCustomer(customerId!), { revalidateOnFocus: false });
}

export function useCustomerServiceTickets(customerId: string | null) {
  return useSWR(customerId ? ["service-tickets", customerId] : null, () => businessCaseService.getTicketsByCustomer(customerId!), { revalidateOnFocus: false });
}
