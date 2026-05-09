import useSWR, { mutate } from "swr";
import { premiumService } from "@/lib/services/premium.service";
import { Premium, PremiumStatus } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { useCollection, useDoc } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

function useIsAllowed() {
  const { user, role } = useAuth();
  const allowed = !!user && (role === "admin" || role === "manager");
  return { user, role, allowed };
}

// ─── Real-time hooks ───────────────────────────────────────────────

export function usePremiums(status?: PremiumStatus) {
  const { allowed } = useIsAllowed();
  const key = status ? `premiums-status-${status}` : "premiums-all";
  return useCollection<Premium>(
    allowed ? key : null,
    "premiums",
    status ? [{ field: "status", operator: "==", value: status }] : undefined,
    "createdAt",
    "desc"
  );
}

export function usePremium(id: string | null) {
  const { allowed } = useIsAllowed();
  return useDoc<Premium>(
    allowed && id ? `premium-${id}` : null,
    "premiums",
    id
  );
}

export function usePremiumsByPolicy(policyId: string | null) {
  const { allowed } = useIsAllowed();
  return useCollection<Premium>(
    allowed && policyId ? `premiums-policy-${policyId}` : null,
    "premiums",
    policyId ? [{ field: "policy_id", operator: "==", value: policyId }] : undefined,
    "createdAt",
    "desc"
  );
}

// ─── SWR hooks ─────────────────────────────────────────────────────

export function useOverduePremiums() {
  const { allowed } = useIsAllowed();
  const swr = useSWR<Premium[]>(
    allowed ? "premiums-overdue" : null,
    () => premiumService.getOverdue(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function usePremiumStats() {
  const { allowed } = useIsAllowed();
  const swr = useSWR(
    allowed ? "premium-stats" : null,
    () => premiumService.getStats(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function usePremiumMonthlySummary(year: number) {
  const { allowed } = useIsAllowed();
  const swr = useSWR(
    allowed ? `premium-monthly-${year}` : null,
    () => premiumService.getMonthlySummary(year),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function usePremiumCount() {
  const { allowed } = useIsAllowed();
  const swr = useSWR<number>(
    allowed ? "premium-count" : null,
    () => premiumService.count(),
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function invalidatePremiums() {
  mutate((key: string) => typeof key === "string" && key.startsWith("premium"), undefined, { revalidate: true });
}
