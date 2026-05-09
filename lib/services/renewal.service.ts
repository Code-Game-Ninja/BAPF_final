/**
 * Supabase Renewal Service
 */

import { supabase } from "@/lib/supabase/client";
import { Renewal, RenewalStatus } from "@/lib/types";
import { toSnakePayload } from "@/lib/helpers/object-helpers";

export async function createRenewal(data: Omit<Renewal, "id" | "createdAt" | "updatedAt">): Promise<Renewal> {
  const now = new Date().toISOString();
  const payload = toSnakePayload(data as Record<string, unknown>);
  const { data: row, error } = await supabase
    .from("renewals")
    .insert({ ...payload, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return { ...row, createdAt: row.created_at, updatedAt: row.updated_at } as Renewal;
}

export async function updateRenewal(id: string, data: Partial<Renewal>): Promise<void> {
  const payload = toSnakePayload(data as Record<string, unknown>);
  payload.updated_at = new Date().toISOString();
  const { error } = await supabase
    .from("renewals")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRenewal(id: string): Promise<void> {
  const { error } = await supabase.from("renewals").delete().eq("id", id);
  if (error) throw error;
}

export async function updateRenewalStatus(id: string, status: RenewalStatus, updatedBy: string, notes?: string): Promise<void> {
  const { error } = await supabase
    .from("renewals")
    .update({ status, updated_by: updatedBy, notes: notes ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getRenewalCount(): Promise<number> {
  const { count, error } = await supabase
    .from("renewals")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getRenewalStats() {
  const { data: renewals, error } = await supabase
    .from("renewals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = new Date();
  const due = (renewals ?? []).filter((r) => r.status === "due").length;
  const overdue = (renewals ?? []).filter((r) => {
    if (r.status !== "due") return false;
    const d = r.due_date ? new Date(r.due_date) : null;
    return d && d < now;
  }).length;
  return {
    total: (renewals ?? []).length,
    due,
    contacted: (renewals ?? []).filter((r) => r.status === "contacted").length,
    renewed: (renewals ?? []).filter((r) => r.status === "renewed").length,
    lost: (renewals ?? []).filter((r) => r.status === "lost").length,
    totalDue: due,
    overdue,
  };
}

export async function getRenewalsByMonth(year: number, month: number): Promise<Renewal[]> {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();
  const { data, error } = await supabase
    .from("renewals")
    .select("*")
    .gte("due_date", start)
    .lt("due_date", end)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Renewal[];
}

export const renewalService = {
  create: createRenewal,
  update: updateRenewal,
  delete: deleteRenewal,
  updateStatus: updateRenewalStatus,
  count: getRenewalCount,
  getStats: getRenewalStats,
  getGroupedByMonth: async (year: number, month: number): Promise<Record<string, Renewal[]>> => {
    const renewals = await getRenewalsByMonth(year, month);
    const grouped: Record<string, Renewal[]> = {};
    renewals.forEach((r) => {
      const key = r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });
    return grouped;
  },
  getDueWithinDays: async (days: number): Promise<Renewal[]> => {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + days * 86400000).toISOString();
    const { data, error } = await supabase
      .from("renewals")
      .select("*")
      .in("status", ["due", "contacted"])
      .gte("due_date", now)
      .lte("due_date", future)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Renewal[];
  },
  getOverdue: async (): Promise<Renewal[]> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("renewals")
      .select("*")
      .in("status", ["due", "contacted"])
      .lt("due_date", now)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Renewal[];
  },
  createFromPolicy: async (policy: import("@/lib/types").Policy, createdBy: string): Promise<import("@/lib/types").Renewal> => {
    const { data: existing, error: existErr } = await supabase
      .from("renewals")
      .select("id")
      .eq("policy_id", policy.id)
      .limit(1);
    if (existErr) throw existErr;
    if (existing && existing.length > 0) throw new Error("Renewal already exists for this policy");
    return createRenewal({
      policy_id: policy.id,
      policy_number: policy.policy_number,
      customer_id: policy.customer_id,
      customer_name: policy.customer_name,
      due_date: policy.end_date,
      status: "due" as RenewalStatus,
      created_by: createdBy,
      updated_by: createdBy,
    } as unknown as Omit<import("@/lib/types").Renewal, "id" | "createdAt" | "updatedAt">);
  },
  markContacted: async (id: string, updatedBy: string, notes?: string): Promise<void> => {
    const { error } = await supabase
      .from("renewals")
      .update({ status: "contacted" as RenewalStatus, updated_by: updatedBy, notes: notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
  bulkCreateFromExpiring: async (start: Date, end: Date, createdBy: string): Promise<{ created: number; skipped: number }> => {
    const { data: policies, error: polErr } = await supabase
      .from("policies")
      .select("*")
      .eq("status", "active")
      .gte("end_date", start.toISOString())
      .lte("end_date", end.toISOString());
    if (polErr) throw polErr;
    const allPolicies = policies ?? [];
    if (allPolicies.length === 0) return { created: 0, skipped: 0 };

    // Batch fetch existing renewals instead of N+1 per-policy lookups
    const policyIds = allPolicies.map((p) => p.id as string);
    const existingPolicyIds = new Set<string>();
    for (let i = 0; i < policyIds.length; i += 500) {
      const chunk = policyIds.slice(i, i + 500);
      const { data: existingRows } = await supabase
        .from("renewals")
        .select("policy_id")
        .in("policy_id", chunk);
      for (const row of existingRows ?? []) {
        existingPolicyIds.add(row.policy_id as string);
      }
    }

    let created = 0;
    let skipped = 0;
    const now = new Date().toISOString();
    const toInsert: Record<string, unknown>[] = [];

    for (const pol of allPolicies) {
      if (existingPolicyIds.has(pol.id)) { skipped++; continue; }
      toInsert.push({
        policy_id: pol.id,
        policy_number: pol.policy_number,
        customer_id: pol.customer_id,
        customer_name: pol.customer_name,
        due_date: pol.end_date,
        status: "due",
        created_by: createdBy,
        updated_by: createdBy,
        created_at: now,
        updated_at: now,
      });
    }

    // Batch insert in chunks of 500
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500);
      const { error: insertErr } = await supabase.from("renewals").insert(chunk);
      if (insertErr) throw insertErr;
    }
    created = toInsert.length;

    return { created, skipped };
  },
};
