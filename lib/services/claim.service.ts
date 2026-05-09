/**
 * Supabase Claim Service — Full CRUD + Timeline + Analytics
 */
import { supabase } from "@/lib/supabase/client";
import type { Claim, ClaimTimeline, ClaimDocument } from "@/lib/types";

// ── List ──
async function list(filters?: {
  status?: string;
  claim_type?: string;
  insurer_name?: string;
  customer_id?: string;
  search?: string;
}) {
  let query = supabase.from("claims")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.claim_type) query = query.eq("claim_type", filters.claim_type);
  if (filters?.insurer_name) query = query.eq("insurer_name", filters.insurer_name);
  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.search)
    query = query.or(
      `customer_name.ilike.%${filters.search}%,claim_number.ilike.%${filters.search}%,policy_number.ilike.%${filters.search}%`
    );

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Claim[];
}

// ── Get by ID ──
async function getById(id: string) {
  const { data, error } = await supabase.from("claims")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Claim;
}

// ── Create ──
async function create(claim: Partial<Claim>) {
  const { data, error } = await supabase.from("claims")
    .insert(claim)
    .select()
    .single();
  if (error) throw error;
  return data as Claim;
}

// ── Update ──
async function update(id: string, updates: Partial<Claim>) {
  const { data, error } = await supabase.from("claims")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Claim;
}

// ── Delete ──
async function remove(id: string) {
  const { error } = await supabase.from("claims").delete().eq("id", id);
  if (error) throw error;
}

// ── Update Status ──
async function updateStatus(
  id: string,
  newStatus: string,
  userId: string,
  userName: string,
  description?: string
) {
  const current = await getById(id);
  const oldStatus = current.status;

  const updates: Partial<Claim> = { status: newStatus as Claim["status"] };
  if (newStatus === "settled")
    updates.settlement_date = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase.from("claims")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("claim_timeline").insert({
    claim_id: id,
    action: "status_change",
    description:
      description || `Status changed from ${oldStatus} to ${newStatus}`,
    old_value: oldStatus,
    new_value: newStatus,
    performed_by: userId,
    performed_by_name: userName,
  });

  return data as Claim;
}

// ── Timeline ──
async function getTimeline(claimId: string) {
  const { data, error } = await supabase.from("claim_timeline")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClaimTimeline[];
}

async function addTimelineEntry(entry: Partial<ClaimTimeline>) {
  const { data, error } = await supabase.from("claim_timeline")
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data as ClaimTimeline;
}

// ── Documents ──
async function getDocuments(claimId: string) {
  const { data, error } = await supabase.from("claim_documents")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClaimDocument[];
}

async function uploadDocument(claimId: string, file: File, userId: string) {
  const filePath = `claims/${claimId}/${Date.now()}_${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from("claim-documents")
    .upload(filePath, file);
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage
    .from("claim-documents")
    .getPublicUrl(filePath);

  const { data, error } = await supabase.from("claim_documents")
    .insert({
      claim_id: claimId,
      file_name: file.name,
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_size: file.size,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ClaimDocument;
}

// ── Analytics ──
async function getClaimStats() {
  const { data, error } = await supabase.from("claims")
    .select(
      "status, claim_type, claim_amount, settled_amount, insurer_name, department"
    );
  if (error) throw error;
  const claims = (data ?? []) as Claim[];

  const totalClaims = claims.length;
  const totalClaimAmount = claims.reduce(
    (s, c) => s + ((c.claim_amount as number) || 0),
    0
  );
  const totalSettled = claims.filter((c) => c.status === "settled");
  const totalSettledAmount = totalSettled.reduce(
    (s, c) => s + ((c.settled_amount as number) || 0),
    0
  );
  const claimRatio =
    totalClaimAmount > 0
      ? Math.round((totalSettledAmount / totalClaimAmount) * 100)
      : 0;

  // By insurer
  const byInsurer: Record<string, { count: number; claimed: number; settled: number }> = {};
  claims.forEach((c) => {
    const ins = (c.insurer_name as string) || "Unknown";
    if (!byInsurer[ins]) byInsurer[ins] = { count: 0, claimed: 0, settled: 0 };
    byInsurer[ins].count++;
    byInsurer[ins].claimed += (c.claim_amount as number) || 0;
    byInsurer[ins].settled += (c.settled_amount as number) || 0;
  });

  // By department
  const byDepartment: Record<string, { count: number; amount: number }> = {};
  claims.forEach((c) => {
    const dept = (c as unknown as Record<string, string>).department || "General";
    if (!byDepartment[dept]) byDepartment[dept] = { count: 0, amount: 0 };
    byDepartment[dept].count++;
    byDepartment[dept].amount += (c.claim_amount as number) || 0;
  });

  // By status
  const byStatus: Record<string, number> = {};
  claims.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });

  // By type
  const byType: Record<string, number> = {};
  claims.forEach((c) => {
    byType[c.claim_type] = (byType[c.claim_type] || 0) + 1;
  });

  return {
    totalClaims,
    totalClaimAmount,
    totalSettledAmount,
    claimRatio,
    pendingClaims:
      (byStatus["registered"] || 0) +
      (byStatus["under_review"] || 0) +
      (byStatus["documents_pending"] || 0),
    settledClaims: byStatus["settled"] || 0,
    rejectedClaims: byStatus["rejected"] || 0,
    byInsurer: Object.entries(byInsurer)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.claimed - a.claimed),
    byDepartment: Object.entries(byDepartment)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount),
    byStatus,
    byType,
  };
}

// ── SLA Helper ──
export function isClaimOverSLA(
  claim: { claim_date: string; status: string },
  slaDays = 14
): boolean {
  // Only active/open claims can breach SLA
  const openStatuses = [
    "registered",
    "under_review",
    "documents_pending",
    "surveyor_assigned",
  ];
  if (!openStatuses.includes(claim.status)) return false;
  const claimDate = new Date(claim.claim_date);
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays > slaDays;
}

export const claimService = {
  list,
  getById,
  create,
  update,
  delete: remove,
  updateStatus,
  getTimeline,
  addTimelineEntry,
  getDocuments,
  uploadDocument,
  getClaimStats,
  isOverSLA: isClaimOverSLA,
};
