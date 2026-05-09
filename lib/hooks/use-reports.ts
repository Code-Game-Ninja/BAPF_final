import useSWR from "swr";
import { reportsService } from "@/lib/services/reports.service";
import { useAuth } from "@/lib/context/auth-context";
import { useRealtimeSubscription } from "./use-realtime";

/** Only admin and manager roles may pull executive report data */
function canAccessReports(user: { role?: string } | null | undefined): boolean {
  return !!user && (user.role === "admin" || user.role === "manager");
}

export function useExecutiveSummary() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-executive-summary" : null,
    () => reportsService.getExecutiveSummary(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function usePolicyTypeBreakdown() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-policy-type-breakdown" : null,
    () => reportsService.getPolicyTypeBreakdown(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function usePolicyStatusBreakdown() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-policy-status-breakdown" : null,
    () => reportsService.getPolicyStatusBreakdown(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useMonthlyPoliciesCreated() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-monthly-policies" : null,
    () => reportsService.getMonthlyPoliciesCreated(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useTopInsurers() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-top-insurers" : null,
    () => reportsService.getTopInsurers(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function usePolicyFinancials() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-policy-financials" : null,
    () => reportsService.getPolicyFinancials(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function useMonthlyPremiumCollection() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-monthly-premium-collection" : null,
    () => reportsService.getMonthlyPremiumCollection(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function usePremiumCollectionRate() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-premium-collection-rate" : null,
    () => reportsService.getPremiumCollectionRate(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "premiums");
  return swr;
}

export function useCommissionSummary() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-commission-summary" : null,
    () => reportsService.getCommissionSummary(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "commissions");
  return swr;
}

export function useMonthlyCommissions() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-monthly-commissions" : null,
    () => reportsService.getMonthlyCommissions(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "commissions");
  return swr;
}

export function useRenewalBreakdown() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-renewal-breakdown" : null,
    () => reportsService.getRenewalBreakdown(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useMonthlyRenewals() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-monthly-renewals" : null,
    () => reportsService.getMonthlyRenewals(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useRenewalConversionRate() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-renewal-conversion-rate" : null,
    () => reportsService.getRenewalConversionRate(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "renewals");
  return swr;
}

export function useMonthlyCustomerGrowth() {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? "reports-monthly-customer-growth" : null,
    () => reportsService.getMonthlyCustomerGrowth(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "customers");
  return swr;
}

export function useAttendanceOverview(year?: number, month?: number) {
  const { user } = useAuth();
  const swr = useSWR(
    canAccessReports(user) ? `reports-attendance-overview-${year}-${month}` : null,
    () => reportsService.getAttendanceOverview(year, month),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "attendance");
  return swr;
}
