import useSWR, { mutate } from "swr";
import { commissionService, commissionRuleService } from "@/lib/services/commission.service";
import { Commission, CommissionRule, CommissionStatus } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { useCollection, useDoc } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

function useIsAllowed() {
  const { user, role } = useAuth();
  const allowed = !!user && (role === "admin" || role === "manager");
  return { user, role, allowed };
}

// ─── Real-time hooks ───────────────────────────────────────────────

export function useCommissions(status?: CommissionStatus) {
  const { allowed } = useIsAllowed();
  const key = status ? `commissions-status-${status}` : "commissions-all";
  return useCollection<Commission>(
    allowed ? key : null,
    "commissions",
    status ? [{ field: "status", operator: "==", value: status }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useCommission(id: string | null) {
  const { allowed } = useIsAllowed();
  return useDoc<Commission>(
    allowed && id ? `commission-${id}` : null,
    "commissions",
    id
  );
}

export function useCommissionsByPolicy(policyId: string | null) {
  const { allowed } = useIsAllowed();
  return useCollection<Commission>(
    allowed && policyId ? `commissions-policy-${policyId}` : null,
    "commissions",
    policyId ? [{ field: "policy_id", operator: "==", value: policyId }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useCommissionsByUser(userId: string | null) {
  const { allowed } = useIsAllowed();
  return useCollection<Commission>(
    allowed && userId ? `commissions-user-${userId}` : null,
    "commissions",
    userId ? [{ field: "user_id", operator: "==", value: userId }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useCommissionRules() {
  const { user } = useAuth();
  return useCollection<CommissionRule>(
    user ? "commission-rules" : null,
    "commission_rules",
    undefined,
    "policy_type",
    "asc"
  );
}

// ─── SWR hooks ─────────────────────────────────────────────────────

export function useCommissionStats() {
  const { allowed } = useIsAllowed();
  const swr = useSWR(
    allowed ? "commission-stats" : null,
    () => commissionService.getStats(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "commissions");
  return swr;
}

export function useUserCommissionSummary(userId: string | null) {
  const { allowed } = useIsAllowed();
  const swr = useSWR(
    allowed && userId ? `commission-user-summary-${userId}` : null,
    () => (userId ? commissionService.getUserSummary(userId) : null),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "commissions", userId ? `user_id=eq.${userId}` : undefined);
  return swr;
}

export function useCommissionCount() {
  const { allowed } = useIsAllowed();
  const swr = useSWR<number>(
    allowed ? "commission-count" : null,
    () => commissionService.count(),
  );
  useRealtimeSubscription(swr, "commissions");
  return swr;
}

export function useCommissionRulesGrouped() {
  const { user } = useAuth();
  const swr = useSWR<Record<string, CommissionRule[]>>(
    user ? "commission-rules-grouped" : null,
    () => commissionRuleService.getActiveGrouped(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "commission_rules");
  return swr;
}

export function invalidateCommissions() {
  mutate(
    (key: string) => typeof key === "string" && key.startsWith("commission"),
    undefined,
    { revalidate: true }
  );
}
