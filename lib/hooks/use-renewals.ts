import useSWR, { mutate } from "swr";
import { renewalService } from "@/lib/services/renewal.service";
import { Renewal, RenewalStatus } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { useCollection, useDoc } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

// ─── Real-time hooks ───────────────────────────────────────────────

export function useRenewals(status?: RenewalStatus) {
  const { user } = useAuth();
  const key = status ? `renewals-status-${status}` : "renewals-all";
  return useCollection<Renewal>(
    user ? key : null,
    "renewals",
    status ? [{ field: "status", operator: "==", value: status }] : undefined,
    "due_date",
    "asc"
  );
}

export function useRenewal(id: string | null) {
  const { user } = useAuth();
  return useDoc<Renewal>(
    user && id ? `renewal-${id}` : null,
    "renewals",
    id
  );
}

export function useRenewalsByPolicy(policyId: string | null) {
  const { user } = useAuth();
  return useCollection<Renewal>(
    user && policyId ? `renewals-policy-${policyId}` : null,
    "renewals",
    policyId ? [{ field: "policy_id", operator: "==", value: policyId }] : undefined,
    "due_date",
    "asc"
  );
}

// ─── SWR hooks ─────────────────────────────────────────────────────

export function useRenewalsDueWithin(days: number) {
  const { user } = useAuth();
  const swr = useSWR<Renewal[]>(
    user ? `renewals-due-${days}` : null,
    () => renewalService.getDueWithinDays(days),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useOverdueRenewals() {
  const { user } = useAuth();
  const swr = useSWR<Renewal[]>(
    user ? "renewals-overdue" : null,
    () => renewalService.getOverdue(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useRenewalCalendar(year: number, month: number) {
  const { user } = useAuth();
  const swr = useSWR<Record<string, Renewal[]>>(
    user ? `renewals-calendar-${year}-${month}` : null,
    () => renewalService.getGroupedByMonth(year, month),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useRenewalStats() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "renewal-stats" : null,
    () => renewalService.getStats(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useRenewalCount() {
  const { user } = useAuth();
  const swr = useSWR<number>(
    user ? "renewal-count" : null,
    () => renewalService.count(),
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function invalidateRenewals() {
  mutate(
    (key) => typeof key === "string" && key.startsWith("renewal"),
    undefined,
    { revalidate: true }
  );
}
