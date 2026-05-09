/**
 * Supabase Proposal Service — Full CRUD + Timeline
 */
import { supabase } from "@/lib/supabase/client";
import type { Proposal, ProposalTimeline } from "@/lib/types";

// ── Auto-numbering ──
export async function getNextProposalNumber(prefix = "PRP"): Promise<string> {
  const resolvedPrefix = prefix.trim().toUpperCase();
  const { count } = await supabase.from("proposals")
    .select("*", { count: "exact", head: true });
  const next = (count ?? 0) + 1;
  return `${resolvedPrefix}-${String(next).padStart(5, "0")}`;
}

// ── Validity date helper ──
export function calcProposalValidUntil(validityDays = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + validityDays);
  return d.toISOString().split("T")[0];
}

// ── List ──
async function list(filters?: {
  status?: string;
  policy_type?: string;
  assigned_to?: string;
  search?: string;
}) {
  let query = supabase.from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.policy_type) query = query.eq("policy_type", filters.policy_type);
  if (filters?.assigned_to) query = query.eq("assigned_to", filters.assigned_to);
  if (filters?.search)
    query = query.or(
      `customer_name.ilike.%${filters.search}%,proposal_number.ilike.%${filters.search}%`
    );

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Proposal[];
}

// ── Get by ID ──
async function getById(id: string) {
  const { data, error } = await supabase.from("proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Proposal;
}

// ── Create ──
async function create(proposal: Partial<Proposal>) {
  const { data, error } = await supabase.from("proposals")
    .insert(proposal)
    .select()
    .single();
  if (error) throw error;
  return data as Proposal;
}

// ── Update ──
async function update(id: string, updates: Partial<Proposal>) {
  const { data, error } = await supabase.from("proposals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Proposal;
}

// ── Delete ──
async function remove(id: string) {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
}

// ── Update Status (with timeline) ──
async function updateStatus(
  id: string,
  newStatus: string,
  userId: string,
  userName: string,
  description?: string
) {
  const current = await getById(id);
  const oldStatus = current.status;

  const { data, error } = await supabase.from("proposals")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("proposal_timeline").insert({
    proposal_id: id,
    stage: "status_change",
    description:
      description || `Status changed from ${oldStatus} to ${newStatus}`,
    old_value: oldStatus,
    new_value: newStatus,
    performed_by: userId,
    performed_by_name: userName,
  });

  return data as Proposal;
}

// ── Convert to Policy ──
async function convertToPolicy(
  proposalId: string,
  policyId: string,
  userId: string,
  userName: string
) {
  const { data, error } = await supabase.from("proposals")
    .update({
      status: "converted",
      converted_policy_id: policyId,
      converted_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("proposal_timeline").insert({
    proposal_id: proposalId,
    stage: "converted",
    description: `Proposal converted to policy`,
    new_value: policyId,
    performed_by: userId,
    performed_by_name: userName,
  });

  return data as Proposal;
}

// ── Timeline ──
async function getTimeline(proposalId: string) {
  const { data, error } = await supabase.from("proposal_timeline")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProposalTimeline[];
}

async function addTimelineEntry(entry: Partial<ProposalTimeline>) {
  const { data, error } = await supabase.from("proposal_timeline")
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data as ProposalTimeline;
}

// ── Stats ──
async function getStats() {
  const { data, error } = await supabase.from("proposals")
    .select("status, premium_quoted");
  if (error) throw error;
  const proposals = (data ?? []) as Proposal[];
  const total = proposals.length;
  const byStatus: Record<string, number> = {};
  let totalQuoted = 0;
  proposals.forEach((p) => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    totalQuoted += (p.premium_quoted as number) || 0;
  });
  const conversionRate =
    total > 0
      ? Math.round(((byStatus["converted"] || 0) / total) * 100)
      : 0;
  return { total, byStatus, totalQuoted, conversionRate };
}

export const proposalService = {
  list,
  getById,
  create,
  update,
  delete: remove,
  updateStatus,
  convertToPolicy,
  getTimeline,
  addTimelineEntry,
  getStats,
  getNextNumber: getNextProposalNumber,
  calcValidUntil: calcProposalValidUntil,
};
