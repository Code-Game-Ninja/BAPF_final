/**
 * Supabase Validity Registry Service
 * Tracks vehicle document validities (Permit, Fitness, PUC, etc.)
 */

import { supabase } from "@/lib/supabase/client";
import { ValidityRegistry } from "@/lib/types";

const TABLE = "validity_registry";

export async function getValidityRegistryByVehicle(vehicleNumber: string): Promise<ValidityRegistry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("vehicle_number", vehicleNumber)
    .order("expiry_date", { ascending: true });
    
  if (error) throw new Error(error.message);
  return (data ?? []) as ValidityRegistry[];
}

export async function getExpiringValidityDocuments(daysAhead = 30): Promise<ValidityRegistry[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureStr = futureDate.toISOString().split('T')[0];
  const nowStr = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .gte("expiry_date", nowStr)
    .lte("expiry_date", futureStr)
    .order("expiry_date", { ascending: true });
    
  if (error) throw new Error(error.message);
  return (data ?? []) as ValidityRegistry[];
}

export async function updateValidityDocument(data: Partial<ValidityRegistry> & { id: string }): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq("id", data.id);
    
  if (error) throw new Error(error.message);
}

export async function createValidityDocument(data: Omit<ValidityRegistry, "id" | "createdAt" | "updatedAt">): Promise<ValidityRegistry> {
  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from(TABLE)
    .insert({
      ...data,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  return created as ValidityRegistry;
}

export const validityService = {
  getByVehicle: (v: string) => getValidityRegistryByVehicle(v),
  getExpiring: (days?: number) => getExpiringValidityDocuments(days),
  update: (data: Partial<ValidityRegistry> & { id: string }) => updateValidityDocument(data),
  create: (data: Omit<ValidityRegistry, "id" | "createdAt" | "updatedAt">) => createValidityDocument(data),
};
