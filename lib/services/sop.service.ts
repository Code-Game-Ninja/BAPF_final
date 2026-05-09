/**
 * Supabase SOP Service
 */
import { supabase } from "@/lib/supabase/client";
import type { SOP } from "@/lib/types";

async function list(filters?: { status?: string; category?: string; search?: string }) {
  let query = supabase.from("sops").select("*").order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SOP[];
}

async function getById(id: string) {
  const { data, error } = await supabase.from("sops").select("*").eq("id", id).single();
  if (error) throw error;
  return data as SOP;
}

async function create(sop: Partial<SOP>) {
  const { data, error } = await supabase.from("sops").insert(sop).select().single();
  if (error) throw error;
  return data as SOP;
}

async function update(id: string, updates: Partial<SOP>) {
  const { data, error } = await supabase.from("sops").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as SOP;
}

async function remove(id: string) {
  const { error } = await supabase.from("sops").delete().eq("id", id);
  if (error) throw error;
}

async function approve(id: string, userId: string) {
  const { data, error } = await supabase.from("sops").update({
    status: "active",
    approved_by: userId,
    approved_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error) throw error;
  return data as SOP;
}

async function archive(id: string) {
  const { data, error } = await supabase.from("sops").update({ status: "archived" }).eq("id", id).select().single();
  if (error) throw error;
  return data as SOP;
}

async function getCategories() {
  const { data, error } = await supabase.from("sops").select("category");
  if (error) throw error;
  const categories = [...new Set((data ?? []).map((d: Record<string, unknown>) => d.category as string))].sort();
  return categories;
}

export const sopService = { list, getById, create, update, delete: remove, approve, archive, getCategories };
