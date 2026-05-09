/**
 * Supabase Campaign & Archive Services
 */

import { supabase } from "@/lib/supabase/client";
import { Campaign, Policy } from "@/lib/types";
import { toSnakePayload } from "@/lib/helpers/object-helpers";

// ── Campaign ─────────────────────────────────────────────────────

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Campaign;
}

export async function createCampaign(data: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Promise<Campaign> {
  const now = new Date().toISOString();
  const payload = toSnakePayload(data as Record<string, unknown>);
  const { data: row, error } = await supabase
    .from("campaigns")
    .insert({ ...payload, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as Campaign;
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<void> {
  const payload = toSnakePayload(data as Record<string, unknown>);
  payload.updated_at = new Date().toISOString();
  const { error } = await supabase
    .from("campaigns")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

export async function getCampaignStats() {
  const { data, error } = await supabase.from("campaigns").select("*");
  if (error) throw error;
  const campaigns = data ?? [];
  const totalBudget = campaigns.reduce((s, c) => s + ((c.budget as number) || 0), 0);
  const totalPremiumGenerated = campaigns.reduce((s, c) => s + ((c.total_premium_generated as number) || 0), 0);
  return {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    totalBudget,
    totalPremiumGenerated,
    overallROI: totalBudget > 0 ? Math.round(((totalPremiumGenerated - totalBudget) / totalBudget) * 100) : 0,
  };
}

export const campaignService = {
  getById: getCampaignById,
  create: createCampaign,
  update: updateCampaign,
  delete: deleteCampaign,
  getStats: getCampaignStats,
};

// ── Archive (non-active policies) ─────────────────────────────────

export async function getArchivedPolicies(): Promise<Policy[]> {
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .in("status", ["archived", "cancelled", "expired"])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Policy[];
}

const ALLOWED_ARCHIVE_STATUSES = new Set(["archived", "cancelled", "expired"]);

export async function getArchivedByStatus(status: string): Promise<Policy[]> {
  if (!ALLOWED_ARCHIVE_STATUSES.has(status)) {
    throw new Error(`Invalid archive status: ${status}`);
  }
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("status", status)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Policy[];
}

export async function getArchiveStats() {
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .in("status", ["archived", "cancelled", "expired"]);
  if (error) throw error;
  const policies = data ?? [];
  return {
    total: policies.length,
    archived: policies.filter((p) => p.status === "archived").length,
    cancelled: policies.filter((p) => p.status === "cancelled").length,
    expired: policies.filter((p) => p.status === "expired").length,
  };
}

export async function restorePolicy(id: string): Promise<void> {
  const { error } = await supabase
    .from("policies")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const archiveService = {
  getAll: getArchivedPolicies,
  getByStatus: getArchivedByStatus,
  getStats: getArchiveStats,
  restore: restorePolicy,
  restorePolicy,
};
