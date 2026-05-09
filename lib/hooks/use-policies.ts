import useSWR, { mutate } from "swr";
import { useMemo } from "react";
import { getExpiryBuckets, getWeeklyExpiring, getPolicyCount } from "@/lib/services/policy.service";
import { Policy } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import {
  useCollection,
  useDoc,
  QueryFilter,
} from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

// ─── Real-time hooks ───────────────────────────────────────────────

export function usePolicies(filters?: QueryFilter[]) {
  const { user, role } = useAuth();
  const isEmployee = role === "employee";

  const assignedFilters = useMemo(() => {
    if (!isEmployee || !user) return undefined;
    const base: QueryFilter[] = filters || [];
    return [...base, { field: "assigned_to", operator: "==" as const, value: user.id }];
  }, [filters, isEmployee, user]);

  const createdFilters = useMemo(() => {
    if (!isEmployee || !user) return undefined;
    const base: QueryFilter[] = filters || [];
    return [...base, { field: "created_by", operator: "==" as const, value: user.id }];
  }, [filters, isEmployee, user]);

  const adminFilters = useMemo(() => {
    if (isEmployee) return undefined;
    const base: QueryFilter[] = filters || [];
    return base.length > 0 ? base : undefined;
  }, [filters, isEmployee]);

  const assignedKey = useMemo(() => {
    if (!user || !isEmployee) return null;
    const parts = ["policies", `assigned-${user.id}`];
    if (filters) parts.push(JSON.stringify(filters));
    return parts.join("-");
  }, [user, isEmployee, filters]);

  const createdKey = useMemo(() => {
    if (!user || !isEmployee) return null;
    const parts = ["policies", `created-${user.id}`];
    if (filters) parts.push(JSON.stringify(filters));
    return parts.join("-");
  }, [user, isEmployee, filters]);

  const adminKey = useMemo(() => {
    if (!user || isEmployee) return null;
    const parts = ["policies"];
    if (filters) parts.push(JSON.stringify(filters));
    else parts.push("all");
    return parts.join("-");
  }, [user, isEmployee, filters]);

  const assigned = useCollection<Policy>(
    assignedKey,
    "policies",
    assignedFilters,
    "created_at",
    "desc"
  );

  const created = useCollection<Policy>(
    createdKey,
    "policies",
    createdFilters,
    "created_at",
    "desc"
  );

  const admin = useCollection<Policy>(
    adminKey,
    "policies",
    adminFilters,
    "created_at",
    "desc"
  );

  const merged = useMemo(() => {
    if (!isEmployee) return admin;

    const assignedData = assigned.data ?? [];
    const createdData = created.data ?? [];

    const seen = new Set<string>();
    const combined: Policy[] = [];
    for (const p of [...assignedData, ...createdData]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        combined.push(p);
      }
    }

    combined.sort((a, b) => {
      const toMs = (v: unknown): number => {
        if (!v) return 0;
        const t = new Date(v as string | number).getTime();
        return Number.isNaN(t) ? 0 : t;
      };
      return toMs(b.createdAt ?? (b as unknown as Record<string, unknown>).created_at) - toMs(a.createdAt ?? (a as unknown as Record<string, unknown>).created_at);
    });

    return {
      data: assigned.isLoading && created.isLoading ? undefined : combined,
      error: assigned.error || created.error,
      isLoading: assigned.isLoading || created.isLoading,
      mutate: () => { assigned.mutate(); created.mutate(); },
    };
  }, [isEmployee, admin, assigned, created]);

  return merged;
}

export function usePolicy(id: string | null) {
  const { user } = useAuth();
  return useDoc<Policy>(
    user && id ? `policy-${id}` : null,
    "policies",
    id
  );
}

export function usePoliciesByCustomer(customerId: string | null) {
  const { user } = useAuth();
  return useCollection<Policy>(
    user && customerId ? `policies-customer-${customerId}` : null,
    "policies",
    customerId ? [{ field: "customer_id", operator: "==", value: customerId }] : undefined,
    "created_at",
    "desc"
  );
}

export function usePoliciesByAssignee(userId: string | null) {
  const { user } = useAuth();
  return useCollection<Policy>(
    user && userId ? `policies-assignee-${userId}` : null,
    "policies",
    userId ? [{ field: "assigned_to", operator: "==", value: userId }] : undefined,
    "created_at",
    "desc"
  );
}

// ─── SWR hooks ─────────────────────────────────────────────────────

export function useExpiryBuckets() {
  const { user, role } = useAuth();
  const assignedTo = role === "employee" ? user?.id : undefined;
  const swr = useSWR(
    user ? `policy-expiry-buckets${assignedTo ? `-${assignedTo}` : ""}` : null,
    () => getExpiryBuckets(assignedTo),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useWeeklyExpiring(weeksAhead: number = 4) {
  const { user, role } = useAuth();
  const assignedTo = role === "employee" ? user?.id : undefined;
  const swr = useSWR<Policy[]>(
    user ? `policies-weekly-${weeksAhead}${assignedTo ? `-${assignedTo}` : ""}` : null,
    () => getWeeklyExpiring(weeksAhead, assignedTo),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function usePolicyCount(filters?: QueryFilter[]) {
  const { user, role } = useAuth();
  const effectiveFilters = useMemo(() => {
    const base: QueryFilter[] = filters || [];
    if (role === "employee" && user) {
      return [...base, { field: "assigned_to", operator: "==" as const, value: user.id }];
    }
    return base.length > 0 ? base : undefined;
  }, [filters, role, user]);

  const key = useMemo(() => {
    if (!user) return null;
    const parts = ["policy-count"];
    if (role === "employee") parts.push(`emp-${user.id}`);
    if (filters) parts.push(JSON.stringify(filters));
    return parts.join("-");
  }, [user, role, filters]);

  const assignedTo =
    effectiveFilters?.find((f) => f.field === "assigned_to")?.value as
      | string
      | undefined;

  const swr = useSWR<number>(key, () => getPolicyCount(assignedTo));
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function invalidatePolicies() {
  mutate(
    (key) => typeof key === "string" && key.startsWith("polic"),
    undefined,
    { revalidate: true }
  );
}
