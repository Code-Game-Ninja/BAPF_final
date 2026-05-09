/**
 * Supabase Endorsement Service
 */
import { supabase } from "@/lib/supabase/client";
import type { Endorsement } from "@/lib/types";

async function list(filters?: { status?: string; policy_id?: string; search?: string }) {
  let query = supabase.from("endorsements").select("*").order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.policy_id) query = query.eq("policy_id", filters.policy_id);
  if (filters?.search) query = query.or(`customer_name.ilike.%${filters.search}%,endorsement_number.ilike.%${filters.search}%,policy_number.ilike.%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Endorsement[];
}

async function getById(id: string) {
  const { data, error } = await supabase.from("endorsements").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Endorsement;
}

async function create(endorsement: Partial<Endorsement>) {
  const { data, error } = await supabase.from("endorsements").insert(endorsement).select().single();
  if (error) throw error;
  return data as Endorsement;
}

async function update(id: string, updates: Partial<Endorsement>) {
  const { data, error } = await supabase.from("endorsements").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Endorsement;
}

async function approve(id: string, userId: string) {
  const { data, error } = await supabase.from("endorsements").update({
    status: "approved",
    approved_by: userId,
    approved_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error) throw error;
  return data as Endorsement;
}

async function reject(id: string, userId: string, reason: string) {
  const { data, error } = await supabase.from("endorsements").update({
    status: "rejected",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    rejection_reason: reason,
  }).eq("id", id).select().single();
  if (error) throw error;
  return data as Endorsement;
}

async function remove(id: string) {
  const { error } = await supabase.from("endorsements").delete().eq("id", id);
  if (error) throw error;
}

export const endorsementService = { list, getById, create, update, approve, reject, delete: remove };
