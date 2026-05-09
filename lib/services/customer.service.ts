/**
 * Supabase Customer Service
 * Replaces lib/mock/services.ts customerService
 */

import { supabase } from "@/lib/supabase/client";
import { Customer } from "@/lib/types";
import type { ExtractedPolicyData } from "@/lib/helpers/pdf-extractor";
import { manualCustomerValidationSchema, type ManualCustomerFormData } from "@/lib/validations/customer";
import { documentService } from "@/lib/services/document.service";

const TABLE = "customers";

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Atomically increments the customer counter and returns the next UID.
 * Uses Supabase RPC function for atomic counter increment.
 */
async function nextCustomerUID(): Promise<string> {
  const { data, error } = await supabase.rpc("next_customer_uid");
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Atomically reserves `count` UIDs in a single call.
 * Returns an array of UID strings in order.
 */
async function bulkNextCustomerUIDs(count: number): Promise<string[]> {
  const { data, error } = await supabase.rpc("bulk_next_customer_uids", { count });
  if (error) throw new Error(error.message);
  return data as string[];
}

export interface BulkCustomerRow {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface BulkImportResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

/**
 * Bulk-create customers from validated rows.
 * Skips rows whose phone already exist.
 * Uses Supabase batch insert for performance.
 */
export async function bulkCreateCustomers(
  rows: BulkCustomerRow[],
  createdBy: string
): Promise<BulkImportResult> {
  const result: BulkImportResult = { created: 0, skipped: 0, errors: [] };

  // Deduplicate rows within file by phone
  const seenPhones = new Set<string>();
  const validRows: (BulkCustomerRow & { _rowIndex: number })[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (seenPhones.has(r.phone)) {
      result.errors.push({ row: i + 1, reason: `Duplicate phone in file: ${r.phone}` });
      result.skipped++;
      continue;
    }
    seenPhones.add(r.phone);
    validRows.push({ ...r, _rowIndex: i + 1 });
  }

  // Check existing phones in Supabase
  const allPhones = validRows.map((r) => r.phone);
  const existingPhones = new Set<string>();
  // Supabase `in` filter supports arrays directly
  if (allPhones.length > 0) {
    // Chunk into batches of 500 for the .in() query
    for (let i = 0; i < allPhones.length; i += 500) {
      const batch = allPhones.slice(i, i + 500);
      const { data: existing } = await supabase
        .from(TABLE)
        .select("phone")
        .in("phone", batch);
      existing?.forEach((d) => existingPhones.add(d.phone));
    }
  }

  const toCreate = validRows.filter((r) => {
    if (existingPhones.has(r.phone)) {
      result.errors.push({ row: r._rowIndex, reason: `Phone already exists: ${r.phone}` });
      result.skipped++;
      return false;
    }
    return true;
  });

  if (toCreate.length === 0) return result;

  // Reserve UIDs atomically
  const uids = await bulkNextCustomerUIDs(toCreate.length);
  const now = new Date().toISOString();

  // Insert in chunks of 500
  for (let i = 0; i < toCreate.length; i += 500) {
    const chunk = toCreate.slice(i, i + 500);
    const records = chunk.map((row, idx) => ({
      uid: uids[i + idx],
      name: row.name,
      email: row.email?.toLowerCase().trim() || "N/A",
      phone: row.phone?.trim() || "N/A",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      pincode: row.pincode || "",
      status: "active",
      customer_type: (row as unknown as Record<string, unknown>).type || (row as unknown as Record<string, unknown>).customer_type || "individual",
      entity_meta: (row as unknown as Record<string, unknown>).entity_meta || {},
      family_id: (row as unknown as Record<string, unknown>).family_id || null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from(TABLE).insert(records);
    if (error) {
      // Track partial inserts up to this point, then throw
      throw new Error(`Chunk insert failed after ${result.created} created: ${error.message}`);
    }
    result.created += chunk.length;
  }

  return result;
}

// Properties that exist on the TS types but NOT as columns in the DB.
const CAMEL_CASE_STRIP_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "lastLoginAt",
  "avatarUrl",
  "isActive",
  "lockedForEmployee",
  "pdfUploaded",
  "isRecurring",
  "familyId", // Strip camelCase versions
  "entityMeta",
  "kycStatus",
  "type" // Maps to customer_type in DB, handled separately
]);

/**
 * Strip camelCase-only keys that don't exist as PostgreSQL columns.
 * Prevents PostgREST 400 "column X of relation Y does not exist".
 */
function stripCamelCaseKeys<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = { ...obj };
  for (const key of CAMEL_CASE_STRIP_KEYS) {
    delete (cleaned as Record<string, unknown>)[key];
  }
  // Also remove `id` if present (auto-generated by DB)
  delete (cleaned as Record<string, unknown>)["id"];
  return cleaned;
}

// ── CRUD ─────────────────────────────────────────────────────────

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data as any),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as Customer;
}

export async function createCustomer(
  data: Omit<Customer, "id" | "uid" | "createdAt" | "updatedAt">,
  createdBy: string
): Promise<Customer> {
  const uid = await nextCustomerUID();
  const now = new Date().toISOString();
  // Ensure required fields are present
  const email = (data as unknown as Record<string, string>).email?.trim() || "N/A";
  const phone = (data as unknown as Record<string, string>).phone?.trim() || "N/A";

  const payload = {
    ...stripCamelCaseKeys(data as Record<string, unknown>),
    uid,
    status: "active",
    email,  // Explicitly set email to ensure it's never null
    phone,  // Explicitly set phone to ensure it's never null
    customer_type: (data as unknown as Record<string, unknown>).type || (data as unknown as Record<string, unknown>).customer_type || "individual",
    entity_meta: (data as unknown as Record<string, unknown>).entity_meta || {},
    family_id: (data as unknown as Record<string, unknown>).family_id || null,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
  const { data: created, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    ...(created as any),
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  } as Customer;
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<void> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({ ...stripCamelCaseKeys(data as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error("Customer not found");
}

export async function deleteCustomer(id: string, deletedBy?: string): Promise<void> {
  // Soft delete: mark as inactive, keep data
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({
      status: "inactive",
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error("Customer not found");
}

/**
 * Soft-delete a customer AND cascade to all related data:
 * - Cancel all active policies belonging to this customer
 * - Soft-cancel related premiums (mark as "cancelled")
 * - Mark related commissions as "rejected"
 * - Mark related renewals as "lost"
 * - Delete related documents (with Storage cleanup)
 */
export async function deleteCustomerWithCascade(
  id: string,
  deletedBy?: string
): Promise<{
  cancelledPolicies: number;
  cancelledPremiums: number;
  rejectedCommissions: number;
  lostRenewals: number;
  deletedDocuments: number;
}> {
  const counts = {
    cancelledPolicies: 0,
    cancelledPremiums: 0,
    rejectedCommissions: 0,
    lostRenewals: 0,
    deletedDocuments: 0,
  };
  const now = new Date().toISOString();

  // 1. Find all policies for this customer
  const { data: policies } = await supabase
    .from("policies")
    .select("id")
    .eq("customer_id", id);
  const policyIds = (policies ?? []).map((p) => p.id);

  // 2. Cancel all policies
  if (policyIds.length > 0) {
    const { data: updatedPolicies } = await supabase
      .from("policies")
      .update({ status: "cancelled", updated_at: now })
      .eq("customer_id", id)
      .select("id");
    counts.cancelledPolicies = updatedPolicies?.length ?? 0;
  }

  // 3. For each policy, cascade to premiums, commissions, renewals
  for (const policyId of policyIds) {
    // Cancel pending premiums
    const { data: updatedPremiums } = await supabase
      .from("premiums")
      .update({ status: "cancelled", updated_at: now })
      .eq("policy_id", policyId)
      .eq("status", "pending")
      .select("id");
    counts.cancelledPremiums += updatedPremiums?.length ?? 0;

    // Reject pending commissions
    const { data: updatedCommissions } = await supabase
      .from("commissions")
      .update({ status: "rejected", updated_at: now })
      .eq("policy_id", policyId)
      .eq("status", "pending")
      .select("id");
    counts.rejectedCommissions += updatedCommissions?.length ?? 0;

    // Mark due/contacted renewals as lost
    const { data: updatedRenewals } = await supabase
      .from("renewals")
      .update({ status: "lost", updated_at: now })
      .eq("policy_id", policyId)
      .in("status", ["due", "contacted"])
      .select("id");
    counts.lostRenewals += updatedRenewals?.length ?? 0;
  }

  // 4. Delete documents linked to this customer (with Storage cleanup)
  const { data: docs } = await supabase
    .from("documents")
    .select("id, file_url")
    .eq("customer_id", id);
  if (docs && docs.length > 0) {
    for (const d of docs) {
      if (d.file_url) {
        try {
          // Extract storage path from URL and delete from Supabase Storage
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
    const docIds = docs.map((d) => d.id);
    await supabase.from("documents").delete().in("id", docIds);
    counts.deletedDocuments = docs.length;
  }

  // 5. Finally soft-delete the customer itself
  const { error: softDelErr } = await supabase
    .from(TABLE)
    .update({
      status: "inactive",
      deleted_at: now,
      deleted_by: deletedBy || null,
      updated_at: now,
    })
    .eq("id", id);
  if (softDelErr) throw new Error(softDelErr.message);

  return counts;
}

export async function getFamilyMembers(familyId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("family_id", familyId)
    .neq("status", "inactive")
    .order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(d => ({
    ...d,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  })) as Customer[];
}

// ── Search ────────────────────────────────────────────────────────

/**
 * Search customers by name (ilike) or exact phone match.
 * Supabase supports case-insensitive search natively with ilike.
 */
export async function searchCustomers(queryStr: string): Promise<Customer[]> {
  const results: Customer[] = [];
  const seenIds = new Set<string>();
  const seenUIDs = new Set<string>();

  const addIfUnique = (c: Customer) => {
    if (seenIds.has(c.id)) return;
    if (c.status === "inactive") return;
    if (c.uid && seenUIDs.has(c.uid)) return;
    seenIds.add(c.id);
    if (c.uid) seenUIDs.add(c.uid);
    results.push(c);
  };

  // Exact phone match
  if (/^\d{7,10}$/.test(queryStr)) {
    const { data } = await supabase
      .from(TABLE)
      .select("*")
      .eq("phone", queryStr)
      .limit(10);
    (data ?? []).forEach((d) => addIfUnique(d as Customer));
  }

  // Case-insensitive name prefix search
  const { data: nameData } = await supabase
    .from(TABLE)
    .select("*")
    .ilike("name", `${queryStr}%`)
    .order("name")
    .limit(20);
  (nameData ?? []).forEach((d) => addIfUnique(d as Customer));

  return results;
}

// ── Count ─────────────────────────────────────────────────────────

export async function getCustomerCount(): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ── Auto-create from PDF extraction ──────────────────────────────

export async function createCustomerFromExtraction(
  data: ExtractedPolicyData,
  createdBy: string
): Promise<{ customer: Customer; isNew: boolean }> {
  // Check for existing customer by phone
  if (data.customerPhone) {
    const { data: byPhone } = await supabase
      .from(TABLE)
      .select("*")
      .eq("phone", data.customerPhone)
      .neq("status", "inactive")
      .limit(1);
    if (byPhone && byPhone.length > 0) {
      return { customer: byPhone[0] as Customer, isNew: false };
    }
  }

  // Check for existing customer by email
  if (data.customerEmail) {
    const { data: byEmail } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email", data.customerEmail)
      .neq("status", "inactive")
      .limit(1);
    if (byEmail && byEmail.length > 0) {
      return { customer: byEmail[0] as Customer, isNew: false };
    }
  }

  // Ensure required fields are never null/undefined
  const email = data.customerEmail?.trim() || "N/A";
  const phone = data.customerPhone?.trim() || "N/A";

  const customer = await createCustomer(
    {
      name: data.customerName || "Unknown Customer",
      phone,
      email,
      address: data.customerAddress || "",
      city: data.customerCity || "",
      state: data.customerState || "",
      pincode: data.customerPincode || "",
      type: "individual",
      entity_meta: {
        dob: (data.startDate || "") as string,
        pan_number: (data.policyNumber && !data.policyNumber.startsWith("P")
          ? data.policyNumber
          : "") as string,
      } as any,
      created_by: createdBy,
    },
    createdBy
  );

  return { customer, isNew: true };
}

/**
 * Advanced Manual Customer Creation
 * Handles Individual/Corporate branching, family members, and documents.
 */
export async function createManualCustomer(
  data: ManualCustomerFormData,
  createdBy: string
): Promise<Customer> {
  const now = new Date().toISOString();
  
  // 1. Determine Family ID
  // If individual has family members, or if it's already part of a family group
  const familyId = data.type === "individual" && data.family_members.length > 0
    ? crypto.randomUUID()
    : null;

  // 2. Prepare Metadata
  const entityMeta = data.type === "individual" ? {
    dob: data.dob,
    gender: data.gender,
    birth_place: data.birth_place,
    height: data.height,
    weight: data.weight,
    education: data.education,
    marital_status: data.marital_status,
    business_job_type: data.business_job_type,
    business_name: data.business_name,
    occupation_nature: data.occupation_nature,
    annual_income: data.annual_income,
    pan_number: data.pan_number,
    gst_number: data.gst_number,
    notes: data.notes,
  } : {
    turnover: data.turnover,
    pan_number: data.pan_number,
    gst_number: data.gst_number,
    notes: data.notes,
    members: data.corporate_members, // Store contacts in JSONB
  };

  // 3. Reserve UIDs (Main + Sub-profiles)
  const fullProfileMembers = data.type === "individual" 
    ? data.family_members.filter(m => m.create_profile)
    : [];
  
  const uids = await bulkNextCustomerUIDs(1 + fullProfileMembers.length);
  let uidIdx = 0;

  // 4. Create Main Customer
  const mainPayload = {
    uid: uids[uidIdx++],
    name: data.name,
    email: data.email?.trim() || "N/A",
    phone: data.phone?.trim() || "N/A",
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    status: "active",
    customer_type: data.type,
    family_id: familyId,
    rm_user_id: data.assigned_to,
    entity_meta: entityMeta,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };

  const { data: mainCustomer, error: mainError } = await supabase
    .from(TABLE)
    .insert(mainPayload)
    .select()
    .single();

  if (mainError) throw new Error(`Failed to create main customer: ${mainError.message}`);

  // 5. Handle Family Members (Individual Only)
  if (data.type === "individual" && familyId) {
    // Add "Self" link for main customer
    await supabase.from("customer_family_members").insert({
      family_id: familyId,
      customer_id: mainCustomer.id,
      relationship: "Self",
    });

    for (const member of data.family_members) {
      let memberCustomerId: string | null = null;

      if (member.create_profile) {
        // Create secondary customer record
        const { data: subRecord, error: subError } = await supabase
          .from(TABLE)
          .insert({
            uid: uids[uidIdx++],
            name: member.name,
            phone: member.mobile?.trim() || "N/A",
            email: "N/A",
            status: "active",
            customer_type: "individual",
            family_id: familyId,
            rm_user_id: data.assigned_to,
            entity_meta: {
              dob: member.dob,
              gender: member.gender,
              notes: member.notes,
            },
            created_by: createdBy,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (subError) {
          console.error("[customerService] Sub-profile creation failed:", subError);
        } else {
          memberCustomerId = subRecord.id;
        }
      }

      // If we have a customer ID (either just created or existing? - existing not supported in this simple flow yet)
      if (memberCustomerId) {
        await supabase.from("customer_family_members").insert({
          family_id: familyId,
          customer_id: memberCustomerId,
          relationship: member.relationship,
        });
      }
    }
  }

  // 6. Handle Documents
  if (data.documents.length > 0) {
    for (const doc of data.documents) {
      if (doc.url) {
        await documentService.create({
          customer_id: mainCustomer.id,
          file_name: doc.name || "document",
          file_path: doc.url,
          file_url: doc.url,
          document_type: doc.type,
          uploaded_by: createdBy,
        });
      }
    }
  }

  return mainCustomer as Customer;
}

// ── Backward-compatible wrapper ───────────────────────────────────

export const customerService = {
  getAll: async (
    _filters?: unknown[],
    _sortField?: string,
    _sortDir?: string
  ): Promise<Customer[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .or("status.is.null,status.eq.active");
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(d => ({
      ...d,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })) as Customer[];
  },
  getById: (id: string) => getCustomer(id),
  create: (data: Omit<Customer, "id" | "uid" | "createdAt" | "updatedAt"> & { created_by?: string }, createdBy?: string) =>
    createCustomer(data, createdBy ?? data.created_by ?? ""),
  update: (id: string, data: Partial<Customer>) => updateCustomer(id, data),
  delete: (id: string, deletedBy?: string) => deleteCustomer(id, deletedBy),
  deleteWithCascade: (id: string, deletedBy?: string) => deleteCustomerWithCascade(id, deletedBy),
  searchByNameOrPhone: (q: string) => searchCustomers(q),
  count: () => getCustomerCount(),
  getNextUid: () => nextCustomerUID(),
  createCustomer: (data: Partial<Customer> & { name: string; phone: string; created_by?: string }, createdBy?: string) =>
    createCustomer(
      data as Omit<Customer, "id" | "uid" | "createdAt" | "updatedAt">,
      createdBy ?? data.created_by ?? ""
    ),
  createCustomerFromExtraction: (data: {
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    customerAddress: string | null;
    customerCity?: string | null;
    customerState?: string | null;
    customerPincode?: string | null;
  }, createdBy: string) =>
    createCustomerFromExtraction(data as Parameters<typeof createCustomerFromExtraction>[0], createdBy),
  findMatchingCustomers: async (name: string, phone: string, email: string): Promise<Customer[]> => {
    const results: Customer[] = [];
    const seenIds = new Set<string>();
    const addUnique = (c: Customer) => {
      if (seenIds.has(c.id) || c.status === "inactive") return;
      seenIds.add(c.id);
      results.push(c);
    };

    const isDummy = (val: string) => !val || val.trim().toLowerCase() === "n/a" || val.trim().toLowerCase() === "unknown" || val.trim().length < 4;

    // Normalize phone: strip spaces, dashes, dots, and leading +91/0
    const normalizePhone = (p: string) =>
      p.replace(/[\s\-\.\(\)]/g, "").replace(/^(\+91|91|0)/, "");

    // 1. Phone match (exact + normalized)
    if (!isDummy(phone)) {
      const cleaned = normalizePhone(phone);
      const { data } = await supabase
        .from(TABLE).select("*")
        .or(`phone.eq.${phone},phone.eq.${cleaned}`)
        .neq("status", "inactive")
        .limit(5);
      (data ?? []).forEach((d) => addUnique(d as Customer));
      // Also try: DB phone normalized matches cleaned input
      if (results.length === 0 && cleaned.length >= 7) {
        const { data: likeData } = await supabase
          .from(TABLE).select("*")
          .ilike("phone", `%${cleaned.slice(-10)}`)
          .neq("status", "inactive")
          .limit(5);
        (likeData ?? []).forEach((d) => addUnique(d as Customer));
      }
      // If we found a match by exact phone, it's a strong match.
      if (results.length > 0) return results;
    }

    // 2. Email match (case-insensitive)
    if (!isDummy(email)) {
      const { data } = await supabase
        .from(TABLE).select("*")
        .ilike("email", email.trim())
        .neq("status", "inactive")
        .limit(5);
      (data ?? []).forEach((d) => addUnique(d as Customer));
      // If we found a match by exact email, it's a strong match.
      if (results.length > 0) return results;
    }

    // 3. Name match (contains, not just prefix)
    if (!isDummy(name)) {
      // Try exact or very close match first
      const { data: exactData } = await supabase
        .from(TABLE).select("*")
        .ilike("name", name.trim())
        .neq("status", "inactive")
        .limit(5);
      (exactData ?? []).forEach((d) => addUnique(d as Customer));

      if (results.length === 0) {
        // Try contains match (more flexible)
        const { data: containsData } = await supabase
          .from(TABLE).select("*")
          .ilike("name", `%${name.trim()}%`)
          .neq("status", "inactive")
          .order("name")
          .limit(10);
        (containsData ?? []).forEach((d) => addUnique(d as Customer));
      }
    }

    return results;
  },
  createManualCustomer: (data: ManualCustomerFormData, createdBy: string) => 
    createManualCustomer(data, createdBy),
  phoneExists: async (phone: string, excludeId?: string): Promise<boolean> => {
    const { data } = await supabase.from(TABLE).select("id").eq("phone", phone).limit(2);
    return (data ?? []).some((d) => d.id !== excludeId);
  },
  emailExists: async (email: string, excludeId?: string): Promise<boolean> => {
    const { data } = await supabase.from(TABLE).select("id").eq("email", email).limit(2);
    return (data ?? []).some((d) => d.id !== excludeId);
  },
  getFamilyMembers: (familyId: string) => getFamilyMembers(familyId),
};
