/**
 * Supabase Policy Service
 * Replaces lib/mock/services.ts policyService
 */

import { supabase } from "@/lib/supabase/client";
import { Policy, ExpiryBucket } from "@/lib/types";
import { toSnakePayload } from "@/lib/helpers/object-helpers";

const TABLE = "policies";

// ── Count ─────────────────────────────────────────────────────────

export async function getPolicyCount(assignedTo?: string): Promise<number> {
  let q = supabase.from(TABLE).select("*", { count: "exact", head: true });
  if (assignedTo) q = q.eq("assigned_to", assignedTo);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ── Category Stats ────────────────────────────────────────────────

export interface PolicyCategoryStats {
  active: number;
  pending: number;
}

export interface PolicyStatsByCategory {
  motor: PolicyCategoryStats;
  life: PolicyCategoryStats;
  health: PolicyCategoryStats;
  commercial: PolicyCategoryStats;
}

const COMMERCIAL_TYPES = ["fire", "marine", "burglary", "liability", "workmen_compensation", "car_ear", "surety_bond"];

export async function getPolicyStatsByCategory(): Promise<PolicyStatsByCategory> {
  const now = new Date().toISOString();

  // Query for motor policies
  const [motorActive, motorPending] = await Promise.all([
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("policy_type", "motor").eq("status", "active"),
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("policy_type", "motor").in("status", ["expired", "cancelled"]).gt("end_date", now),
  ]);

  // Query for life policies
  const [lifeActive, lifePending] = await Promise.all([
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("policy_type", "life").eq("status", "active"),
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("policy_type", "life").in("status", ["expired", "cancelled"]).gt("end_date", now),
  ]);

  // Query for health policies
  const [healthActive, healthPending] = await Promise.all([
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("policy_type", "health").eq("status", "active"),
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("policy_type", "health").in("status", ["expired", "cancelled"]).gt("end_date", now),
  ]);

  // Query for commercial policies (multiple types)
  const [commercialActive, commercialPending] = await Promise.all([
    supabase.from(TABLE).select("*", { count: "exact", head: true }).in("policy_type", COMMERCIAL_TYPES).eq("status", "active"),
    supabase.from(TABLE).select("*", { count: "exact", head: true }).in("policy_type", COMMERCIAL_TYPES).in("status", ["expired", "cancelled"]).gt("end_date", now),
  ]);

  return {
    motor: { active: motorActive.count ?? 0, pending: motorPending.count ?? 0 },
    life: { active: lifeActive.count ?? 0, pending: lifePending.count ?? 0 },
    health: { active: healthActive.count ?? 0, pending: healthPending.count ?? 0 },
    commercial: { active: commercialActive.count ?? 0, pending: commercialPending.count ?? 0 },
  };
}

// ── Next policy number (PREVIEW ONLY — not atomic) ───────────────

export async function getNextPolicyNumber(type: string, prefix?: string): Promise<string> {
  const resolvedPrefix = prefix ? prefix.trim().toUpperCase() : type.toUpperCase().slice(0, 3);
  const year = new Date().getFullYear();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("policy_type", type);
  if (error) throw new Error(error.message);
  return `${resolvedPrefix}-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

// ── Expiry buckets (dashboard widget) ────────────────────────────

export async function getExpiryBuckets(
  assignedTo?: string
): Promise<ExpiryBucket[]> {
  const now = new Date().toISOString();
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("status", "active")
    .gte("end_date", now)
    .lte("end_date", threeMonthsLater)
    .order("end_date", { ascending: true })
    .limit(500);
  if (assignedTo) q = q.eq("assigned_to", assignedTo);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const policies = ((data ?? []) as any[]).map(p => ({
    ...p,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  })) as Policy[];

  const nowMs = Date.now();
  const buckets: ExpiryBucket[] = [
    { label: "This Week", count: 0, policies: [] },
    { label: "This Month", count: 0, policies: [] },
    { label: "Next 3 Months", count: 0, policies: [] },
  ];

  for (const p of policies) {
    const endDate = new Date(p.end_date as unknown as string);
    const days = (endDate.getTime() - nowMs) / 86400000;
    if (days <= 7) { buckets[0].count++; buckets[0].policies.push(p); }
    else if (days <= 30) { buckets[1].count++; buckets[1].policies.push(p); }
    else { buckets[2].count++; buckets[2].policies.push(p); }
  }

  return buckets;
}

// ── Weekly expiring ───────────────────────────────────────────────

export async function getWeeklyExpiring(
  weeksAhead = 4,
  assignedTo?: string
): Promise<Policy[]> {
  const now = new Date().toISOString();
  const endTs = new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000).toISOString();

  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("status", "active")
    .gte("end_date", now)
    .lte("end_date", endTs)
    .order("end_date", { ascending: true })
    .limit(200);
  if (assignedTo) q = q.eq("assigned_to", assignedTo);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(p => ({
    ...p,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  })) as Policy[];
}

// ── Create ────────────────────────────────────────────────────────

export async function createPolicy(
  data: Omit<Policy, "id" | "createdAt" | "updatedAt">
): Promise<Policy> {
  const now = new Date().toISOString();
  const payload = toSnakePayload(data as Record<string, unknown>, { stripKeys: ["id", "createdAt", "updatedAt", "deletedAt"] });

  const { data: created, error } = await supabase
    .from(TABLE)
    .insert({ ...payload, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    ...(created as any),
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  } as Policy;
}

// ── Update ────────────────────────────────────────────────────────

export async function updatePolicy(
  id: string,
  data: Partial<Policy>
): Promise<void> {
  const payload = toSnakePayload(data as Record<string, unknown>, { stripKeys: ["id", "createdAt", "updatedAt", "deletedAt"] });
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Delete ────────────────────────────────────────────────────────

export async function deletePolicy(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Delete a policy AND all its related data (premiums, commissions, renewals, documents).
 */
export async function deletePolicyWithCascade(id: string): Promise<{
  deletedPremiums: number;
  deletedCommissions: number;
  deletedRenewals: number;
  deletedDocuments: number;
}> {
  const counts = { deletedPremiums: 0, deletedCommissions: 0, deletedRenewals: 0, deletedDocuments: 0 };

  async function deleteRelated(table: string, field: string, value: string): Promise<number> {
    // For documents, clean up storage first
    if (table === "documents") {
      const { data: docs } = await supabase
        .from(table)
        .select("id, file_url")
        .eq(field, value);
      if (docs) {
        for (const d of docs) {
          if (d.file_url) {
            try {
              const url = new URL(d.file_url);
              const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);
              if (pathMatch) {
                const [bucket, ...rest] = pathMatch[1].split("/");
                await supabase.storage.from(bucket).remove([rest.join("/")]);
              }
            } catch {
              // best-effort
            }
          }
        }
      }
    }

    const { data } = await supabase
      .from(table)
      .delete()
      .eq(field, value)
      .select("id");
    return data?.length ?? 0;
  }

  const [premiums, commissions, renewals, documents] = await Promise.all([
    deleteRelated("premiums", "policy_id", id),
    deleteRelated("commissions", "policy_id", id),
    deleteRelated("renewals", "policy_id", id),
    deleteRelated("documents", "policy_id", id),
  ]);

  counts.deletedPremiums = premiums;
  counts.deletedCommissions = commissions;
  counts.deletedRenewals = renewals;
  counts.deletedDocuments = documents;

  const { error: delErr } = await supabase.from(TABLE).delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  return counts;
}

// ── Lock / Unlock ─────────────────────────────────────────────────

export async function lockPolicyForEmployee(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({
    locked_for_employee: true,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function unlockPolicyForEmployee(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({
    locked_for_employee: false,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Verification ──────────────────────────────────────────────────

export async function confirmPolicyVerification(
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from(TABLE).update({
    verification_confirmed: true,
    verification_confirmed_by: userId,
    verification_confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Remark ────────────────────────────────────────────────────────

export async function updatePolicyRemark(
  id: string,
  remark: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from(TABLE).update({
    remark,
    remark_updated_by: userId,
    remark_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Backward-compatible wrapper ───────────────────────────────────

export const policyService = {
  getAll: async (
    filters?: Array<{ field: string; operator: string; value: unknown }>,
    _sortField?: string,
    _sortDir?: string
  ): Promise<Policy[]> => {
    let q = supabase.from(TABLE).select("*");
    if (filters) {
      for (const f of filters) {
        switch (f.operator) {
          case "==": q = q.eq(f.field, f.value); break;
          case "!=": q = q.neq(f.field, f.value); break;
          case "in": if (Array.isArray(f.value)) q = q.in(f.field, f.value); break;
          default: break;
        }
      }
    }
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(p => ({
      ...p,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })) as Policy[];
  },
  getById: async (id: string): Promise<Policy | null> => {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (!data) return null;
    return {
      ...(data as any),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Policy;
  },
  create: (data: Omit<Policy, "id" | "createdAt" | "updatedAt">) => createPolicy(data),
  update: (id: string, data: Partial<Policy>) => updatePolicy(id, data),
  delete: (id: string) => deletePolicy(id),
  deleteWithCascade: (id: string) => deletePolicyWithCascade(id),
  createPolicy: (data: Omit<Policy, "id" | "createdAt" | "updatedAt">) => createPolicy(data),
  count: (filters?: Array<{ field: string; operator: string; value: unknown }>) =>
    getPolicyCount(filters?.find((f) => f.field === "assigned_to")?.value as string | undefined),
  getExpiryBuckets: (assignedTo?: string) => getExpiryBuckets(assignedTo),
  getWeeklyExpiring: (weeksAhead?: number, assignedTo?: string) => getWeeklyExpiring(weeksAhead, assignedTo),
  getNextPolicyNumber: (type: string, prefix?: string) => getNextPolicyNumber(type, prefix),
  getByAssignedTo: async (userId: string): Promise<Policy[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("assigned_to", userId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(p => ({
      ...p,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })) as Policy[];
  },
  updateRemark: (id: string, remark: string, userId: string) => updatePolicyRemark(id, remark, userId),
  unlockForEmployee: (id: string) => unlockPolicyForEmployee(id),
  lockForEmployee: (id: string) => lockPolicyForEmployee(id),
  confirmVerification: (id: string, userId: string) => confirmPolicyVerification(id, userId),
  getPolicyStatsByCategory: () => getPolicyStatsByCategory(),
};
