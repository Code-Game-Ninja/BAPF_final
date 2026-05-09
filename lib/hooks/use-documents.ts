import useSWR, { mutate } from "swr";
import { documentService } from "@/lib/services/document.service";
import { Document } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { useCollection } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

export function useDocuments() {
  const { user } = useAuth();
  return useCollection<Document>(
    user ? "documents" : null,
    "documents",
    undefined,
    "createdAt",
    "desc"
  );
}

export function usePolicyDocuments(policyId: string | null) {
  return useCollection<Document>(
    policyId ? `documents-policy-${policyId}` : null,
    "documents",
    policyId ? [{ field: "policy_id", operator: "==", value: policyId }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useCustomerDocuments(customerId: string | null) {
  return useCollection<Document>(
    customerId ? `documents-customer-${customerId}` : null,
    "documents",
    customerId
      ? [{ field: "customer_id", operator: "==", value: customerId }]
      : undefined,
    "createdAt",
    "desc"
  );
}

export function useDocumentsByType(type: string | null) {
  return useCollection<Document>(
    type ? `documents-type-${type}` : null,
    "documents",
    type ? [{ field: "document_type", operator: "==", value: type }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useDocument(id: string | null) {
  const swr = useSWR<Document | null>(
    id ? `document-${id}` : null,
    () => (id ? documentService.getById(id) : null),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(swr, "documents", id ? `id=eq.${id}` : undefined);
  return swr;
}

export function useDocumentStats() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "document-stats" : null,
    () => documentService.getStats(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "documents");
  return swr;
}

export function invalidateDocuments() {
  mutate(
    (key: string) => typeof key === "string" && key.startsWith("document"),
    undefined,
    { revalidate: true }
  );
}
