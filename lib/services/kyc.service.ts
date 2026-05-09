/**
 * Supabase KYC Document Service
 */
import { supabase } from "@/lib/supabase/client";
import type { KYCDocument } from "@/lib/types";

async function listByCustomer(customerId: string) {
  const { data, error } = await supabase.from("kyc_documents")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KYCDocument[];
}

async function getById(id: string) {
  const { data, error } = await supabase.from("kyc_documents").select("*").eq("id", id).single();
  if (error) throw error;
  return data as KYCDocument;
}

async function upload(customerId: string, file: File, documentType: string, documentNumber: string, userId: string) {
  const filePath = `kyc/${customerId}/${Date.now()}_${file.name}`;
  const { error: uploadErr } = await supabase.storage.from("kyc-documents").upload(filePath, file);
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage.from("kyc-documents").getPublicUrl(filePath);

  const { data, error } = await supabase.from("kyc_documents").insert({
    customer_id: customerId,
    document_type: documentType,
    document_number: documentNumber,
    file_path: filePath,
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_size: file.size,
    uploaded_by: userId,
  }).select().single();
  if (error) throw error;
  return data as KYCDocument;
}

async function verify(id: string, userId: string) {
  const { data, error } = await supabase.from("kyc_documents").update({
    status: "verified",
    verified_by: userId,
    verified_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error) throw error;
  return data as KYCDocument;
}

async function reject(id: string, userId: string, reason: string) {
  const { data, error } = await supabase.from("kyc_documents").update({
    status: "rejected",
    verified_by: userId,
    verified_at: new Date().toISOString(),
    rejection_reason: reason,
  }).eq("id", id).select().single();
  if (error) throw error;
  return data as KYCDocument;
}

async function remove(id: string) {
  const doc = await getById(id);
  if (doc.file_path) {
    await supabase.storage.from("kyc-documents").remove([doc.file_path]);
  }
  const { error } = await supabase.from("kyc_documents").delete().eq("id", id);
  if (error) throw error;
}

async function getSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage.from("kyc-documents").createSignedUrl(filePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

async function getPendingCount() {
  const { count, error } = await supabase.from("kyc_documents").select("*", { count: "exact", head: true }).eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

async function getCustomerKYCStatus(customerId: string) {
  const docs = await listByCustomer(customerId);
  const total = docs.length;
  const verified = docs.filter(d => d.status === "verified").length;
  const pending = docs.filter(d => d.status === "pending").length;
  const rejected = docs.filter(d => d.status === "rejected").length;
  const hasAadhaar = docs.some(d => d.document_type === "aadhaar" && d.status === "verified");
  const hasPan = docs.some(d => d.document_type === "pan" && d.status === "verified");
  return { total, verified, pending, rejected, hasAadhaar, hasPan, isComplete: hasAadhaar && hasPan };
}

export const kycService = {
  listByCustomer,
  getById,
  upload,
  verify,
  reject,
  delete: remove,
  getPendingCount,
  getCustomerKYCStatus,
  getSignedUrl,
};
