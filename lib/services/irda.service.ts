/**
 * Supabase IRDA Report Service
 */
import { supabase } from "@/lib/supabase/client";

// Policy Register — IRDA format
async function getPolicyRegister(filters?: { from?: string; to?: string; insurer?: string }) {
  let query = supabase.from("policies").select("policy_number, policy_type, customer_name, insurer_name, start_date, end_date, premium_amount, sum_insured, status, assigned_to_name, business_type, created_at");
  if (filters?.from) query = query.gte("start_date", filters.from);
  if (filters?.to) query = query.lte("start_date", filters.to);
  if (filters?.insurer) query = query.eq("insurer_name", filters.insurer);
  const { data, error } = await query.order("start_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Premium Register
async function getPremiumRegister(filters?: { from?: string; to?: string }) {
  let query = supabase.from("premiums").select("policy_number, customer_name, amount, period, due_date, status, collected_date, created_at");
  if (filters?.from) query = query.gte("due_date", filters.from);
  if (filters?.to) query = query.lte("due_date", filters.to);
  const { data, error } = await query.order("due_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Claim Register
async function getClaimRegister(filters?: { from?: string; to?: string }) {
  let query = supabase.from("claims").select("claim_number, policy_number, customer_name, claim_type, claim_amount, settled_amount, status, claim_date, incident_date, insurer_name, settlement_date");
  if (filters?.from) query = query.gte("claim_date", filters.from);
  if (filters?.to) query = query.lte("claim_date", filters.to);
  const { data, error } = await query.order("claim_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Commission Disclosure
async function getCommissionDisclosure(filters?: { from?: string; to?: string }) {
  let query = supabase.from("commissions").select("policy_number, user_name, amount, status, paid_date, created_at");
  if (filters?.from) query = query.gte("created_at", filters.from);
  if (filters?.to) query = query.lte("created_at", filters.to);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Summary Report
async function getComplianceSummary() {
  const [policies, premiums, claims, commissions] = await Promise.all([
    supabase.from("policies").select("status, premium_amount, policy_type"),
    supabase.from("premiums").select("status, amount"),
    supabase.from("claims").select("status, claim_amount, settled_amount"),
    supabase.from("commissions").select("status, amount"),
  ]);

  const policyData = policies.data ?? [];
  const premiumData = premiums.data ?? [];
  const claimData = claims.data ?? [];
  const commissionData = commissions.data ?? [];

  return {
    totalPolicies: policyData.length,
    activePolicies: policyData.filter(p => p.status === "active").length,
    totalPremiumAmount: policyData.reduce((s, p) => s + ((p.premium_amount as number) || 0), 0),
    totalPremiumCollected: premiumData.filter(p => p.status === "collected").reduce((s, p) => s + ((p.amount as number) || 0), 0),
    totalClaims: claimData.length,
    totalClaimAmount: claimData.reduce((s: number, c: any) => s + ((c.claim_amount as number) || 0), 0),
    totalSettledAmount: claimData.reduce((s: number, c: any) => s + ((c.settled_amount as number) || 0), 0),
    claimRatio: (() => {
      const premium = policyData.reduce((s, p) => s + ((p.premium_amount as number) || 0), 0);
      const settled = claimData.reduce((s: number, c: any) => s + ((c.settled_amount as number) || 0), 0);
      return premium > 0 ? Math.round((settled / premium) * 100) : 0;
    })(),
    totalCommissions: commissionData.reduce((s: number, c: any) => s + ((c.amount as number) || 0), 0),
    policyTypeBreakdown: (() => {
      const breakdown: Record<string, number> = {};
      policyData.forEach(p => { breakdown[p.policy_type || "other"] = (breakdown[p.policy_type || "other"] || 0) + 1; });
      return breakdown;
    })(),
  };
}

// Convert to CSV format
function toCSV(data: Record<string, unknown>[], filename: string): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    const val = row[h];
    const strVal = val === null || val === undefined ? "" : String(val);
    return strVal.includes(",") ? `"${strVal}"` : strVal;
  }).join(","));
  return [headers.join(","), ...rows].join("\n");
}

export const irdaService = {
  getPolicyRegister,
  getPremiumRegister,
  getClaimRegister,
  getCommissionDisclosure,
  getComplianceSummary,
  toCSV,
};
