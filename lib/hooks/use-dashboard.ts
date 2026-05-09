import useSWR from "swr";
import { dashboardService } from "@/lib/services/dashboard.service";
import { policyService, PolicyStatsByCategory } from "@/lib/services/policy.service";
import { useAuth } from "@/lib/context/auth-context";
import { useRealtimeSubscription } from "./use-realtime";

export function useDashboardStats() {
  const { user, role } = useAuth();
  const swr = useSWR(
    user ? `dashboard-stats-${role}` : null,
    () => dashboardService.getStats(role),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useRecentActivity(limit?: number) {
  const { user, role } = useAuth();
  const userId = user?.id;
  const swr = useSWR(
    user ? `dashboard-recent-activity-${role}-${userId}` : null,
    () => dashboardService.getRecentActivity(limit, role, userId),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "audit_logs");
  return swr;
}

export function useUpcomingRenewals() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "dashboard-upcoming-renewals" : null,
    () => dashboardService.getUpcomingRenewals(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useOverdueItems() {
  const { user, role } = useAuth();
  const swr = useSWR(
    user ? `dashboard-overdue-items-${role}` : null,
    () => dashboardService.getOverdueItems(role),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function useComplianceMatrix() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "dashboard-compliance-matrix" : null,
    () => dashboardService.getComplianceMatrix(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "validity_registry");
  return swr;
}

export function useCelebrations() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "dashboard-celebrations" : null,
    () => dashboardService.getCelebrations(),
    { revalidateOnFocus: false }
  );
  return swr;
}

export function usePolicyCategoryStats() {
  const { user } = useAuth();
  const swr = useSWR<PolicyStatsByCategory>(
    user ? "policy-category-stats" : null,
    () => policyService.getPolicyStatsByCategory(),
    { revalidateOnFocus: false, refreshInterval: 30000 } // fallback polling every 30s
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}
