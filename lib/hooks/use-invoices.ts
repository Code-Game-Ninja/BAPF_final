"use client";
import useSWR from "swr";
import { invoiceService, ledgerService } from "@/lib/services/invoice.service";

export function useInvoices(filters?: Parameters<typeof invoiceService.list>[0]) {
  return useSWR(["invoices", filters], () => invoiceService.list(filters), { revalidateOnFocus: false });
}

export function useInvoice(id: string | null) {
  return useSWR(id ? ["invoice", id] : null, () => invoiceService.getById(id!), { revalidateOnFocus: false });
}

export function useInvoiceItems(invoiceId: string | null) {
  return useSWR(invoiceId ? ["invoice-items", invoiceId] : null, () => invoiceService.getItems(invoiceId!), { revalidateOnFocus: false });
}

export function useInvoiceStats() {
  return useSWR("invoice-stats", () => invoiceService.getStats(), { revalidateOnFocus: false });
}

export function useLedgerEntries(filters?: Parameters<typeof ledgerService.list>[0]) {
  return useSWR(["ledger-entries", filters], () => ledgerService.list(filters), { revalidateOnFocus: false });
}

export function useLedgerBalance(customerId?: string) {
  return useSWR(["ledger-balance", customerId], () => ledgerService.getBalance(customerId), { revalidateOnFocus: false });
}
