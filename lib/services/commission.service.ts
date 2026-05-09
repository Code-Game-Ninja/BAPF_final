/**
 * Supabase Commission & CommissionRule Services
 */

import { supabase } from "@/lib/supabase/client";
import { Commission, CommissionRule, CommissionStatus } from "@/lib/types";
import { toSnakePayload } from "@/lib/helpers/object-helpers";

const COMM_TBL = "commissions";
const RULE_TBL = "commission_rules";

// ── Commission ─────────────────────────────────────────────────────

export async function createCommission(data: Omit<Commission, "id" | "createdAt" | "updatedAt">): Promise<Commission> {
  const now = new Date().toISOString();
  const payload = toSnakePayload(data as Record<string, unknown>);
  const { data: row, error } = await supabase
    .from(COMM_TBL)
    .insert({ ...payload, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as Commission;
}

export async function updateCommission(id: string, data: Partial<Commission>): Promise<void> {
  const payload = toSnakePayload(data as Record<string, unknown>);
  payload.updated_at = new Date().toISOString();
  const { error } = await supabase
    .from(COMM_TBL)
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCommission(id: string): Promise<void> {
  const { error } = await supabase.from(COMM_TBL).delete().eq("id", id);
  if (error) throw error;
}

const VALID_STATUSES: CommissionStatus[] = ["pending", "approved", "paid", "rejected"];

export async function updateCommissionStatus(id: string, status: CommissionStatus): Promise<void> {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid commission status: ${status}`);
  }
  const { error } = await supabase
    .from(COMM_TBL)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getCommissionCount(): Promise<number> {
  const { count, error } = await supabase
    .from(COMM_TBL)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getCommissionStats() {
  const { data: comms, error } = await supabase.from(COMM_TBL).select("status, amount");
  if (error) throw error;
  const all = comms ?? [];
  const pending = all.filter((c) => c.status === "pending").length;
  const approved = all.filter((c) => c.status === "approved").length;
  const paid = all.filter((c) => c.status === "paid").length;
  const totalAmount = all.reduce((s, c) => s + ((c.amount as number) || 0), 0);
  const paidAmount = all.filter((c) => c.status === "paid").reduce((s, c) => s + ((c.amount as number) || 0), 0);
  const approvedAmount = all.filter((c) => c.status === "approved").reduce((s, c) => s + ((c.amount as number) || 0), 0);
  const pendingAmount = all.filter((c) => c.status === "pending").reduce((s, c) => s + ((c.amount as number) || 0), 0);
  return {
    total: all.length,
    pending, approved, paid,
    totalAmount, paidAmount,
    totalPending: pending, amountPending: pendingAmount,
    totalApproved: approved, amountApproved: approvedAmount,
    totalPaid: paid, amountPaid: paidAmount,
  };
}

export async function getUserCommissionSummary(userId: string) {
  const { data: comms, error } = await supabase
    .from(COMM_TBL)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const all = comms ?? [];
  return {
    total: all.length,
    earned: all.filter((c) => c.status === "paid").reduce((s, c) => s + ((c.amount as number) || 0), 0),
    pending: all.filter((c) => c.status === "pending").reduce((s, c) => s + ((c.amount as number) || 0), 0),
  };
}

// Backward-compatible service wrapper
export const commissionService = {
  create: createCommission,
  update: updateCommission,
  delete: deleteCommission,
  updateStatus: updateCommissionStatus,
  count: getCommissionCount,
  getStats: getCommissionStats,
  getUserSummary: getUserCommissionSummary,
  approve: (id: string) => updateCommissionStatus(id, "approved" as CommissionStatus),
  markPaid: (id: string) => updateCommissionStatus(id, "paid" as CommissionStatus),
  bulkCalculate: async (
    actorId: string,
    actorName: string
  ): Promise<{ created: number; skipped: number; noRule: number }> => {
    // 1. Fetch all active policies
    const { data: policiesData, error: polErr } = await supabase
      .from("policies")
      .select("*")
      .eq("status", "active");
    if (polErr) throw polErr;
    const policies = (policiesData ?? []) as Array<{
      id: string;
      policy_number?: string;
      policy_type?: string;
      premium_amount?: number;
      insurer_name?: string;
      assigned_to?: string;
      assigned_to_name?: string;
    }>;

    // 2. Fetch all active commission rules
    const { data: rulesData, error: ruleErr } = await supabase
      .from(RULE_TBL)
      .select("*")
      .eq("is_active", true);
    if (ruleErr) throw ruleErr;
    const rules = (rulesData ?? []) as Array<{
      id: string;
      policy_type?: string;
      commission_type?: string;
      value?: number;
      min_premium?: number;
      max_premium?: number;
      insurer_name?: string;
    }>;

    // 2b. Read default_commission_rate and calculation_mode from settings
    let defaultRate = 10;
    let calcMode = "premium_based";
    try {
      const [defRes, modeRes] = await Promise.all([
        supabase.from("system_config").select("value").eq("key", "default_commission_rate").maybeSingle(),
        supabase.from("system_config").select("value").eq("key", "commission_calculation_mode").maybeSingle(),
      ]);
      if (defRes.data) {
        const v = parseFloat(String(defRes.data.value));
        if (!isNaN(v) && v >= 0) defaultRate = v;
      }
      if (modeRes.data) {
        const m = String(modeRes.data.value || "premium_based");
        if (["premium_based", "flat", "tiered"].includes(m)) calcMode = m;
      }
    } catch { /* ignore – use hardcoded fallback */ }

    // 3. Get existing policy_ids that already have a commission (to skip)
    const { data: existingData } = await supabase.from(COMM_TBL).select("policy_id");
    const existingPolicyIds = new Set(
      (existingData ?? []).map((d) => d.policy_id as string).filter(Boolean)
    );

    let created = 0;
    let skipped = 0;
    let noRule = 0;
    const toInsert: Record<string, unknown>[] = [];
    const now = new Date().toISOString();

    for (const policy of policies) {
      if (existingPolicyIds.has(policy.id)) { skipped++; continue; }

      const matchingRule = [
        ...rules.filter((r) => r.insurer_name && r.insurer_name === policy.insurer_name),
        ...rules.filter((r) => !r.insurer_name),
      ].find((r) => {
        if (r.policy_type !== policy.policy_type) return false;
        const premium = policy.premium_amount ?? 0;
        if (r.min_premium !== undefined && r.min_premium !== null && premium < r.min_premium) return false;
        if (r.max_premium !== undefined && r.max_premium !== null && premium > r.max_premium) return false;
        return true;
      });

      if (!matchingRule) {
        if (defaultRate <= 0) { noRule++; continue; }
        const premium = policy.premium_amount ?? 0;
        const amount = calcMode === "flat"
          ? defaultRate
          : Math.round((premium * defaultRate) / 100 * 100) / 100;
        toInsert.push({
          policy_id: policy.id,
          policy_number: policy.policy_number,
          user_id: policy.assigned_to || actorId,
          user_name: policy.assigned_to_name || actorName,
          amount,
          status: "pending" as CommissionStatus,
          rule_id: null,
          created_at: now,
          updated_at: now,
        });
        continue;
      }

      const premium = policy.premium_amount ?? 0;
      const amount =
        matchingRule.commission_type === "percentage"
          ? Math.round((premium * (matchingRule.value ?? 0)) / 100 * 100) / 100
          : (matchingRule.value ?? 0);

      toInsert.push({
        policy_id: policy.id,
        policy_number: policy.policy_number,
        user_id: policy.assigned_to || actorId,
        user_name: policy.assigned_to_name || actorName,
        amount,
        status: "pending" as CommissionStatus,
        rule_id: matchingRule.id,
        created_at: now,
        updated_at: now,
      });
    }

    // Batch insert in chunks of 500
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500);
      const { error: insertErr } = await supabase.from(COMM_TBL).insert(chunk);
      if (insertErr) throw insertErr;
    }
    created = toInsert.length;

    return { created, skipped, noRule };
  },
};

// ── CommissionRule ─────────────────────────────────────────────────

export async function getAllCommissionRules(): Promise<CommissionRule[]> {
  const { data, error } = await supabase
    .from(RULE_TBL)
    .select("*")
    .order("policy_type", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommissionRule[];
}

export async function createCommissionRule(data: Omit<CommissionRule, "id" | "createdAt" | "updatedAt">): Promise<CommissionRule> {
  const now = new Date().toISOString();
  const raw = { ...data } as Record<string, unknown>;
  raw.is_active = raw.isActive ?? true;
  delete raw.isActive;
  delete raw.createdAt;
  delete raw.updatedAt;
  const { data: row, error } = await supabase
    .from(RULE_TBL)
    .insert({ ...raw, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as CommissionRule;
}

export async function updateCommissionRule(id: string, data: Partial<CommissionRule>): Promise<void> {
  const payload = toSnakePayload(data as Record<string, unknown>);
  payload.updated_at = new Date().toISOString();
  const { error } = await supabase
    .from(RULE_TBL)
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCommissionRule(id: string): Promise<void> {
  const { error } = await supabase.from(RULE_TBL).delete().eq("id", id);
  if (error) throw error;
}

export async function getActiveCommissionRulesGrouped(): Promise<Record<string, CommissionRule[]>> {
  const { data, error } = await supabase
    .from(RULE_TBL)
    .select("*")
    .eq("is_active", true)
    .order("policy_type", { ascending: true });
  if (error) throw error;
  const grouped: Record<string, CommissionRule[]> = {};
  (data ?? []).forEach((d) => {
    const rule = d as CommissionRule;
    const key = rule.policy_type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rule);
  });
  return grouped;
}

// Backward-compatible service wrapper
export const commissionRuleService = {
  getAll: getAllCommissionRules,
  create: createCommissionRule,
  createRule: (data: Omit<CommissionRule, "id" | "createdAt" | "updatedAt" | "isActive"> & { isActive?: boolean }) =>
    createCommissionRule({ isActive: true, ...data }),
  update: updateCommissionRule,
  delete: deleteCommissionRule,
  getActiveGrouped: getActiveCommissionRulesGrouped,
  toggleActive: async (id: string, forceState?: boolean): Promise<void> => {
    const { data: row, error } = await supabase
      .from(RULE_TBL)
      .select("is_active")
      .eq("id", id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Commission rule not found");
    const current = row.is_active as boolean;
    const newActive = forceState !== undefined ? forceState : !current;
    const { error: upErr } = await supabase
      .from(RULE_TBL)
      .update({ is_active: newActive, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (upErr) throw upErr;
  },

  /**
   * Recalculate amounts of all PENDING commissions that were generated by a specific rule.
   * Called after a rule is updated to keep amounts in sync.
   * Only touches "pending" commissions — approved/paid are locked and won't change.
   */
  recalculatePendingByRule: async (ruleId: string): Promise<{ updated: number; skipped: number }> => {
    const { data: ruleRow, error: ruleErr } = await supabase
      .from(RULE_TBL)
      .select("*")
      .eq("id", ruleId)
      .single();
    if (ruleErr || !ruleRow) return { updated: 0, skipped: 0 };
    const rule = ruleRow as CommissionRule;

    const { data: commRows, error: commErr } = await supabase
      .from(COMM_TBL)
      .select("*")
      .eq("rule_id", ruleId)
      .eq("status", "pending");
    if (commErr || !commRows || commRows.length === 0) return { updated: 0, skipped: 0 };

    // Batch fetch all related policies at once instead of N+1
    const policyIds = [...new Set(commRows.map((c) => c.policy_id as string).filter(Boolean))];
    const policyMap = new Map<string, number>();
    for (let i = 0; i < policyIds.length; i += 500) {
      const chunk = policyIds.slice(i, i + 500);
      const { data: polRows } = await supabase
        .from("policies")
        .select("id, premium_amount")
        .in("id", chunk);
      for (const p of polRows ?? []) {
        policyMap.set(p.id as string, (p.premium_amount as number) ?? 0);
      }
    }

    let updated = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    for (const comm of commRows) {
      const policyId = comm.policy_id as string;
      if (!policyId || !policyMap.has(policyId)) { skipped++; continue; }

      const premium = policyMap.get(policyId)!;
      const newAmount =
        rule.commission_type === "percentage"
          ? Math.round((premium * (rule.value ?? 0)) / 100 * 100) / 100
          : (rule.value ?? 0);

      const oldAmount = (comm.amount as number) ?? 0;
      if (newAmount !== oldAmount) {
        await supabase
          .from(COMM_TBL)
          .update({ amount: newAmount, updated_at: now })
          .eq("id", comm.id);
        updated++;
      } else {
        skipped++;
      }
    }

    return { updated, skipped };
  },
};
