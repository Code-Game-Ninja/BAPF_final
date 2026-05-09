/**
 * Supabase Performance Service — Employee business analytics
 */
import { supabase } from "@/lib/supabase/client";

export interface EmployeePerformance {
  user_id: string;
  user_name: string;
  designation: string;
  policiesSold: number;
  totalPremium: number;
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number;
  renewalsDue: number;
  renewalsDone: number;
  renewalRate: number;
  commissionEarned: number;
  customersCreated: number;
}

async function getEmployeePerformance(filters?: { branch_id?: string; designation?: string }) {
  // Fetch all employees
  let usersQuery = supabase.from("users").select("id, name, designation, branch_id").eq("status", "active");
  if (filters?.branch_id) usersQuery = usersQuery.eq("branch_id", filters.branch_id);
  if (filters?.designation) usersQuery = usersQuery.eq("designation", filters.designation);
  const { data: users, error: usersErr } = await usersQuery;
  if (usersErr) throw usersErr;

  // Parallel fetch all needed data
  const [policies, leads, renewals, commissions, customers] = await Promise.all([
    supabase.from("policies").select("assigned_to, premium_amount, business_type"),
    supabase.from("sales_leads").select("assigned_to, status").is("deleted_at", null),
    supabase.from("renewals").select("updated_by, status"),
    supabase.from("commissions").select("user_id, amount, status").eq("status", "paid"),
    supabase.from("customers").select("created_by"),
  ]);

  const policyData = policies.data ?? [];
  const leadData = leads.data ?? [];
  const renewalData = renewals.data ?? [];
  const commissionData = commissions.data ?? [];
  const customerData = customers.data ?? [];

  const results: EmployeePerformance[] = (users ?? []).map(u => {
    const userPolicies = policyData.filter(p => p.assigned_to === u.id);
    const userLeads = leadData.filter(l => l.assigned_to === u.id);
    const userRenewals = renewalData.filter(r => r.updated_by === u.id);
    const userCommissions = commissionData.filter((c: { user_id: string }) => c.user_id === u.id);
    const userCustomers = customerData.filter((c: { created_by: string }) => c.created_by === u.id);
    const leadsConverted = userLeads.filter(l => l.status === "converted").length;
    const renewalsDone = userRenewals.filter(r => r.status === "renewed").length;

    return {
      user_id: u.id,
      user_name: u.name,
      designation: u.designation || "employee",
      policiesSold: userPolicies.length,
      totalPremium: userPolicies.reduce((s, p) => s + ((p.premium_amount as number) || 0), 0),
      leadsAssigned: userLeads.length,
      leadsConverted,
      conversionRate: userLeads.length > 0 ? Math.round((leadsConverted / userLeads.length) * 100) : 0,
      renewalsDue: userRenewals.length,
      renewalsDone,
      renewalRate: userRenewals.length > 0 ? Math.round((renewalsDone / userRenewals.length) * 100) : 0,
      commissionEarned: userCommissions.reduce((s: number, c: { amount: number }) => s + ((c.amount as number) || 0), 0),
      customersCreated: userCustomers.length,
    };
  });

  return results.sort((a, b) => b.totalPremium - a.totalPremium);
}

async function getTeamHierarchy() {
  const { data, error } = await supabase.from("users").select("id, name, role, designation, mapped_manager_id, mapped_bqp_id, status, branch_id").eq("status", "active");
  if (error) throw error;
  return data ?? [];
}

// Persistency ratio
async function getPersistencyRatio(filters?: { insurer?: string; policy_type?: string }) {
  const renewalQuery = supabase.from("renewals").select("status, policy_id");
  const { data: renewals, error } = await renewalQuery;
  if (error) throw error;

  let policyQuery = supabase.from("policies").select("id, policy_type, insurer_name, business_type");
  if (filters?.insurer) policyQuery = policyQuery.eq("insurer_name", filters.insurer);
  if (filters?.policy_type) policyQuery = policyQuery.eq("policy_type", filters.policy_type);
  const { data: policies, error: polErr } = await policyQuery;
  if (polErr) throw polErr;

  const policyIds = new Set((policies ?? []).map(p => p.id));
  const filteredRenewals = (renewals ?? []).filter(r => policyIds.has(r.policy_id));
  const total = filteredRenewals.length;
  const renewed = filteredRenewals.filter(r => r.status === "renewed").length;
  const lost = filteredRenewals.filter(r => r.status === "lost").length;
  const ratio = total > 0 ? Math.round((renewed / total) * 100) : 0;

  // By insurer
  const byInsurer: Record<string, { total: number; renewed: number; ratio: number }> = {};
  (policies ?? []).forEach(p => {
    const ins = p.insurer_name || "Unknown";
    if (!byInsurer[ins]) byInsurer[ins] = { total: 0, renewed: 0, ratio: 0 };
  });
  filteredRenewals.forEach(r => {
    const policy = (policies ?? []).find(p => p.id === r.policy_id);
    if (policy) {
      const ins = policy.insurer_name || "Unknown";
      if (!byInsurer[ins]) byInsurer[ins] = { total: 0, renewed: 0, ratio: 0 };
      byInsurer[ins].total++;
      if (r.status === "renewed") byInsurer[ins].renewed++;
    }
  });
  Object.values(byInsurer).forEach(v => { v.ratio = v.total > 0 ? Math.round((v.renewed / v.total) * 100) : 0; });

  return {
    total,
    renewed,
    lost,
    ratio,
    byInsurer: Object.entries(byInsurer).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.ratio - a.ratio),
  };
}

// Monthly business analytics
async function getMonthlyBusinessAnalytics() {
  const { data, error } = await supabase.from("policies").select("created_at, premium_amount, business_type, status");
  if (error) throw error;
  const policies = data ?? [];

  const months: Record<string, { fresh: number; renewal: number; revenue: number; count: number }> = {};
  policies.forEach(p => {
    const ts = p.created_at;
    if (!ts) return;
    const date = new Date(ts);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = { fresh: 0, renewal: 0, revenue: 0, count: 0 };
    months[key].count++;
    months[key].revenue += (p.premium_amount as number) || 0;
    if (p.business_type === "renewal") months[key].renewal++;
    else months[key].fresh++;
  });

  return Object.entries(months).sort().map(([month, v]) => ({ month, ...v }));
}

export const performanceService = {
  getEmployeePerformance,
  getTeamHierarchy,
  getPersistencyRatio,
  getMonthlyBusinessAnalytics,
};
