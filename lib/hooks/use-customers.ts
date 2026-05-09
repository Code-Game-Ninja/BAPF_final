import useSWR, { mutate } from "swr";
import { searchCustomers, getCustomerCount, customerService } from "@/lib/services/customer.service";
import { Customer } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import {
  useCollection,
  useDoc,
  QueryFilter as RTFilter,
} from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

// Same interface: re-export QueryFilter type for consumers
export type { RTFilter as QueryFilter };

// ─── Real-time hooks ─────────────────────────────────────────────

export function useCustomers(filters?: RTFilter[]) {
  const { user } = useAuth();
  const key = filters
    ? `customers-${JSON.stringify(filters)}`
    : "customers-all";

  const result = useCollection<Customer>(
    user ? key : null,
    "customers",
    filters,
    "name",
    "asc"
  );

  // Filter out soft-deleted (inactive) customers on the client side
  const activeData = result.data
    ?.filter((c) => !c.status || c.status === "active")
    .filter(((seenUIDs: Set<string>) => (c: Customer) => {
      if (!c.uid) return true;
      if (seenUIDs.has(c.uid)) return false;
      seenUIDs.add(c.uid);
      return true;
    })(new Set<string>()));

  return {
    ...result,
    data: activeData,
  };
}

export function useCustomer(id: string | null) {
  return useDoc<Customer>(
    id ? `customer-${id}` : null,
    "customers",
    id
  );
}

export function useCustomerByUID(uid: string | null) {
  const result = useCollection<Customer>(
    uid ? `customer-uid-${uid}` : null,
    "customers",
    uid ? [{ field: "uid", operator: "==", value: uid }] : undefined
  );

  return {
    ...result,
    data: result.data?.[0] || null,
  };
}

// ─── SWR hooks ─────────────────────────────────────────────────────

export function useCustomerSearch(query: string) {
  return useSWR<Customer[]>(
    query.length >= 2 ? `customer-search-${query}` : null,
    () => searchCustomers(query),
    { revalidateOnFocus: false, dedupingInterval: 300 }
  );
}

export function useCustomerCount() {
  const { user } = useAuth();
  const swr = useSWR<number>(
    user ? "customer-count" : null,
    () => getCustomerCount(),
  );
  useRealtimeSubscription(swr, "customers");
  return swr;
}

export function invalidateCustomers() {
  mutate((key) => typeof key === "string" && key.startsWith("customer"), undefined, {
    revalidate: true,
  });
}

export function useFamilyMembers(familyId: string | null) {
  const swr = useSWR<Customer[]>(
    familyId ? `customer-family-${familyId}` : null,
    () => customerService.getFamilyMembers(familyId!)
  );
  
  return swr;
}
