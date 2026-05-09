/**
 * Supabase Reports Service — aggregated analytics
 */

import { supabase } from "@/lib/supabase/client";

export async function getExecutiveSummary() {
  const [totalRes, activeRes, custRes, premRes, commRes, renewalRes] = await Promise.all([
    supabase.from("policies").select("*", { count: "exact", head: true }),
    supabase.from("policies").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("premiums").select("amount, status"),
    supabase.from("commissions").select("amount, status"),
    supabase.from("renewals").select("status"),
  ]);

  const premiums = premRes.data ?? [];
  const comms = commRes.data ?? [];
  const renewals = renewalRes.data ?? [];

  const totalPremiumAmount = premiums.reduce((s, p) => s + ((p.amount as number) || 0), 0);
  const collectedAmount = premiums.filter((p) => p.status === "collected").reduce((s, p) => s + ((p.amount as number) || 0), 0);
  const totalCommissions = comms.reduce((s, c) => s + ((c.amount as number) || 0), 0);
  const paidCommissions = comms.filter((c) => c.status === "paid").reduce((s, c) => s + ((c.amount as number) || 0), 0);
  const renewalRate = renewals.length > 0
    ? Math.round((renewals.filter((r) => r.status === "renewed").length / renewals.length) * 100)
    : 0;

  return {
    totalPolicies: totalRes.count ?? 0,
    activePolicies: activeRes.count ?? 0,
    totalCustomers: custRes.count ?? 0,
    totalPremiumAmount,
    collectedAmount,
    pendingAmount: premiums.filter((p) => p.status === "pending").reduce((s, p) => s + ((p.amount as number) || 0), 0),
    totalCommissions,
    renewalRate,
    totalPremiumCollected: collectedAmount,
    totalCommissionEarned: paidCommissions,
    premiumCollectionRate: totalPremiumAmount > 0 ? Math.round((collectedAmount / totalPremiumAmount) * 100) : 0,
  };
}

export async function getPolicyTypeBreakdown(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("policies").select("policy_type");
  if (error) throw error;
  const breakdown: Record<string, number> = {};
  (data ?? []).forEach((d) => {
    const type = d.policy_type || "other";
    breakdown[type] = (breakdown[type] || 0) + 1;
  });
  return breakdown;
}

export async function getPolicyStatusBreakdown(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("policies").select("status");
  if (error) throw error;
  const breakdown: Record<string, number> = {};
  (data ?? []).forEach((d) => {
    const status = d.status || "unknown";
    breakdown[status] = (breakdown[status] || 0) + 1;
  });
  return breakdown;
}

export async function getMonthlyPoliciesCreated() {
  const { data, error } = await supabase
    .from("policies")
    .select("created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const months: Record<string, number> = {};
  (data ?? []).forEach((d) => {
    const ts = d.created_at;
    if (!ts) return;
    const date = new Date(ts);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months[key] = (months[key] || 0) + 1;
  });
  return Object.entries(months).sort().map(([month, count]) => ({ month, count }));
}

export async function getTopInsurers() {
  const { data, error } = await supabase.from("policies").select("insurer_name, premium_amount");
  if (error) throw error;
  const insurers: Record<string, { count: number; premium: number }> = {};
  (data ?? []).forEach((d) => {
    const name = d.insurer_name || "Unknown";
    if (!insurers[name]) insurers[name] = { count: 0, premium: 0 };
    insurers[name].count++;
    insurers[name].premium += (d.premium_amount as number) || 0;
  });
  return Object.entries(insurers)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.premium - a.premium);
}

export async function getPolicyFinancials() {
  const { data, error } = await supabase.from("policies").select("premium_amount, sum_insured");
  if (error) throw error;
  const policies = data ?? [];
  const totalPremium = policies.reduce((s, p) => s + ((p.premium_amount as number) || 0), 0);
  const averagePremium = policies.length > 0 ? Math.round(totalPremium / policies.length) : 0;
  return {
    totalPremium,
    totalSumInsured: policies.reduce((s, p) => s + ((p.sum_insured as number) || 0), 0),
    averagePremium,
    avgPremium: averagePremium,
    policyCount: policies.length,
  };
}

export const reportsService = {
  getExecutiveSummary,
  getPolicyTypeBreakdown,
  getPolicyStatusBreakdown,
  getMonthlyPoliciesCreated,
  getTopInsurers,
  getPolicyFinancials,
  getMonthlyPremiumCollection: async () => {
    const { data, error } = await supabase
      .from("premiums")
      .select("created_at, amount, status")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const months: Record<string, { collected: number; pending: number; overdue: number; total: number }> = {};
    (data ?? []).forEach((d) => {
      const ts = d.created_at;
      if (!ts) return;
      const date = new Date(ts);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { collected: 0, pending: 0, overdue: 0, total: 0 };
      months[key].total += (d.amount as number) || 0;
      if (d.status === "collected") months[key].collected += (d.amount as number) || 0;
      else if (d.status === "pending") months[key].pending += (d.amount as number) || 0;
      else if (d.status === "overdue") months[key].overdue += (d.amount as number) || 0;
    });
    return Object.entries(months).sort().map(([month, v]) => ({ month, collected: v.collected, pending: v.pending, overdue: v.overdue }));
  },
  getPremiumCollectionRate: async () => {
    const stats = await import("@/lib/services/premium.service").then(m => m.getPremiumStats());
    return { rate: stats.collectionRate, collected: stats.collectedAmount, total: stats.totalAmount, totalAmount: stats.totalAmount, collectedAmount: stats.collectedAmount };
  },
  getCommissionSummary: async () => {
    const stats = await import("@/lib/services/commission.service").then(m => m.getCommissionStats());
    return stats;
  },
  getMonthlyCommissions: async () => {
    const { data, error } = await supabase
      .from("commissions")
      .select("created_at, amount")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const months: Record<string, number> = {};
    (data ?? []).forEach((d) => {
      const ts = d.created_at;
      if (!ts) return;
      const date = new Date(ts);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + ((d.amount as number) || 0);
    });
    return Object.entries(months).sort().map(([month, amount]) => ({ month, amount }));
  },
  getRenewalBreakdown: async () => {
    const stats = await import("@/lib/services/renewal.service").then(m => m.getRenewalStats());
    return stats;
  },
  getMonthlyRenewals: async () => {
    const { data, error } = await supabase
      .from("renewals")
      .select("created_at, status")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const months: Record<string, { due: number; renewed: number; lost: number }> = {};
    (data ?? []).forEach((d) => {
      const ts = d.created_at;
      if (!ts) return;
      const date = new Date(ts);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { due: 0, renewed: 0, lost: 0 };
      months[key].due++;
      if (d.status === "renewed") months[key].renewed++;
      else if (d.status === "lost") months[key].lost++;
    });
    return Object.entries(months).sort().map(([month, v]) => ({ month, due: v.due, renewed: v.renewed, lost: v.lost }));
  },
  getRenewalConversionRate: async () => {
    const stats = await import("@/lib/services/renewal.service").then(m => m.getRenewalStats());
    const rate = stats.total > 0 ? Math.round((stats.renewed / stats.total) * 100) : 0;
    return { rate, renewed: stats.renewed, total: stats.total };
  },
  getMonthlyCustomerGrowth: async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const months: Record<string, number> = {};
    (data ?? []).forEach((d) => {
      const ts = d.created_at;
      if (!ts) return;
      const date = new Date(ts);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + 1;
    });
    let cumulative = 0;
    return Object.entries(months).sort().map(([month, count]) => {
      cumulative += count;
      return { month, count, cumulative };
    });
  },
  getAttendanceOverview: async (year?: number, month?: number) => {
    let query = supabase.from("attendance").select("date, status, worked_hours");
    if (year) {
      const startDate = `${year}-${month ? String(month).padStart(2, "0") : "01"}-01`;
      const endMonth = month ? month : 12;
      const endDay = month ? new Date(year, month, 0).getDate() : 31;
      const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      query = query.gte("date", startDate).lte("date", endDate);
    }
    const { data, error } = await query;
    if (error) throw error;
    const records = data ?? [];
    const present = records.filter((r) => r.status === "present").length;
    const totalHours = records.reduce((s, r) => s + ((r.worked_hours as number) || 0), 0);
    return {
      total: records.length,
      present,
      absent: records.filter((r) => r.status === "absent").length,
      late: records.filter((r) => r.status === "late").length,
      halfDay: records.filter((r) => r.status === "half-day").length,
      leave: records.filter((r) => r.status === "leave").length,
      avgHours: present > 0 ? Math.round((totalHours / present) * 10) / 10 : 0,
    };
  },
};
