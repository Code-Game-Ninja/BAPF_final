/**
 * Supabase Premium Service
 */

import { supabase } from "@/lib/supabase/client";
import { Premium, PremiumStatus } from "@/lib/types";
import { toSnakePayload } from "@/lib/helpers/object-helpers";

export async function createPremium(data: Omit<Premium, "id" | "createdAt" | "updatedAt">): Promise<Premium> {
  const now = new Date().toISOString();
  const payload = toSnakePayload(data as Record<string, unknown>);
  const { data: row, error } = await supabase
    .from("premiums")
    .insert({ ...payload, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as Premium;
}

export async function updatePremium(id: string, data: Partial<Premium>): Promise<void> {
  const payload = toSnakePayload(data as Record<string, unknown>);
  payload.updated_at = new Date().toISOString();
  const { error } = await supabase
    .from("premiums")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deletePremium(id: string): Promise<void> {
  const { error } = await supabase.from("premiums").delete().eq("id", id);
  if (error) throw error;
}

export async function updatePremiumStatus(
  id: string,
  status: PremiumStatus,
  notes?: string,
  collectedBy?: string,
): Promise<void> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) update.notes = notes;
  if (status === "collected") {
    update.collected_at = new Date().toISOString();
    if (collectedBy) update.collected_by = collectedBy;
  }
  const { error } = await supabase.from("premiums").update(update).eq("id", id);
  if (error) throw error;
}

export async function getPremiumCount(): Promise<number> {
  const { count, error } = await supabase
    .from("premiums")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getPremiumStats() {
  const { data: premiums, error } = await supabase.from("premiums").select("status, amount");
  if (error) throw error;
  const all = premiums ?? [];
  const totalAmount = all.reduce((s, p) => s + ((p.amount as number) || 0), 0);
  const collected = all.filter((p) => p.status === "collected");
  const pending = all.filter((p) => p.status === "pending");
  const overdue = all.filter((p) => p.status === "overdue");
  const collectedAmount = collected.reduce((s, p) => s + ((p.amount as number) || 0), 0);
  const pendingAmount = pending.reduce((s, p) => s + ((p.amount as number) || 0), 0);
  const overdueAmount = overdue.reduce((s, p) => s + ((p.amount as number) || 0), 0);
  return {
    total: all.length,
    totalAmount,
    collectedAmount,
    pendingAmount,
    collectionRate: totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0,
    overdue: overdue.length,
    totalCollected: collected.length, amountCollected: collectedAmount,
    totalPending: pending.length, amountPending: pendingAmount,
    totalOverdue: overdue.length, amountOverdue: overdueAmount,
  };
}

export async function getPremiumsByMonth(year: number, month: number): Promise<Premium[]> {
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, month, 1)).toISOString();
  const { data, error } = await supabase
    .from("premiums")
    .select("*")
    .gte("due_date", start)
    .lt("due_date", end)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Premium[];
}

// Backward-compatible service wrapper
export const premiumService = {
  create: createPremium,
  update: updatePremium,
  delete: deletePremium,
  updateStatus: updatePremiumStatus,
  count: getPremiumCount,
  getStats: getPremiumStats,
  getByMonth: getPremiumsByMonth,
  markCollected: (id: string, collectedBy?: string) => updatePremiumStatus(id, "collected" as PremiumStatus, undefined, collectedBy),
  markOverdue: (id: string) => updatePremiumStatus(id, "overdue" as PremiumStatus),
  getOverdue: async (): Promise<Premium[]> => {
    const { data, error } = await supabase
      .from("premiums")
      .select("*")
      .eq("status", "overdue")
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Premium[];
  },
  getMonthlySummary: async (year: number) => {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const premiums = await getPremiumsByMonth(year, m);
      const collected = premiums.filter((p) => p.status === "collected").reduce((s, p) => s + (p.amount || 0), 0);
      const pending = premiums.filter((p) => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0);
      months.push({ month: m, year, collected, pending, count: premiums.length });
    }
    return months;
  },
  generateForPolicy: async (policyId: string, createdBy: string): Promise<{ created: number; skipped: number }> => {
    const { data: existing, error: existErr } = await supabase
      .from("premiums")
      .select("id")
      .eq("policy_id", policyId)
      .limit(1);
    if (existErr) throw existErr;
    if (existing && existing.length > 0) return { created: 0, skipped: 1 };

    const { data: polData, error: polErr } = await supabase
      .from("policies")
      .select("*")
      .eq("id", policyId)
      .single();
    if (polErr || !polData) return { created: 0, skipped: 1 };

    let period = "";
    if (polData.end_date) {
      const d = new Date(polData.end_date);
      period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    await createPremium({
      policy_id: policyId,
      policy_number: polData.policy_number || "",
      customer_id: polData.customer_id || "",
      customer_name: polData.customer_name || "",
      amount: polData.premium_amount || 0,
      due_date: polData.end_date,
      period,
      status: "pending" as PremiumStatus,
      created_by: createdBy,
    } as Omit<Premium, "id" | "createdAt" | "updatedAt">);
    return { created: 1, skipped: 0 };
  },
};
