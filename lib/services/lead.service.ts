/**
 * Supabase Sales Lead Service
 * CRUD operations for the sales_leads, lead_timeline, and lead_documents tables.
 */

import { supabase } from "@/lib/supabase/client";
import { SalesLead, LeadTimeline, LeadDocument, LeadReminder, LeadStatus } from "@/lib/types";

const TABLE = "sales_leads";
const TIMELINE_TABLE = "lead_timeline";
const DOCUMENTS_TABLE = "lead_documents";

// ── Helpers ──────────────────────────────────────────────────────

async function nextLeadUID(): Promise<string> {
  const { data, error } = await supabase.rpc("next_lead_uid");
  if (error) throw new Error(error.message);
  return data as string;
}

async function bulkNextLeadUIDs(count: number): Promise<string[]> {
  const { data, error } = await supabase.rpc("bulk_next_lead_uids", { n: count });
  if (error) throw new Error(error.message);
  return data as string[];
}

// ── CRUD ─────────────────────────────────────────────────────────

export async function getLead(id: string): Promise<SalesLead | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SalesLead) ?? null;
}

export async function getLeads(): Promise<SalesLead[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesLead[];
}

export async function getLeadsByAssignee(userId: string): Promise<SalesLead[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("assigned_to", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesLead[];
}

export async function createLead(
  leadData: {
    customer_name: string;
    mobile: string;
    alt_mobile?: string;
    email?: string;
    source: string;
    assigned_to: string;
    assigned_to_name?: string;
    priority: string;
    status?: string;
    notes?: string;
    follow_up_date?: string;
    branch_id?: string;
    poc_name?: string;
    location?: string;
    client_type?: string;
    estimated_value?: number;
  },
  createdBy: string,
  createdByName?: string
): Promise<SalesLead> {
  const lead_number = await nextLeadUID();
  const now = new Date().toISOString();

  const payload = {
    lead_number,
    lead_date: new Date().toISOString().split("T")[0],
    customer_name: leadData.customer_name,
    mobile: leadData.mobile,
    alt_mobile: leadData.alt_mobile || null,
    email: leadData.email || null,
    source: leadData.source,
    assigned_to: leadData.assigned_to,
    assigned_to_name: leadData.assigned_to_name || null,
    priority: leadData.priority,
    status: leadData.status || "new",
    notes: leadData.notes || null,
    follow_up_date: leadData.follow_up_date || null,
    branch_id: leadData.branch_id || null,
    poc_name: leadData.poc_name || null,
    location: leadData.location || null,
    client_type: leadData.client_type || "individual",
    estimated_value: leadData.estimated_value || 0,
    created_by: createdBy,
    created_by_name: createdByName || null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Add initial timeline entry
  await addTimelineEntry(
    (data as SalesLead).id,
    "created",
    `Lead ${lead_number} created for ${leadData.customer_name}`,
    createdBy,
    createdByName
  );

  return data as SalesLead;
}

export async function updateLead(
  id: string,
  data: Partial<Record<string, unknown>>
): Promise<void> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error("Lead not found");
}

export async function deleteLead(id: string, deletedBy: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error("Lead not found");
}

// ── Timeline ────────────────────────────────────────────────────

export async function getLeadTimeline(leadId: string): Promise<LeadTimeline[]> {
  const { data, error } = await supabase
    .from(TIMELINE_TABLE)
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadTimeline[];
}

export async function addTimelineEntry(
  leadId: string,
  action: string,
  description: string,
  performedBy: string,
  performedByName?: string,
  oldValue?: string,
  newValue?: string,
  metadata?: Record<string, unknown>
): Promise<LeadTimeline> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TIMELINE_TABLE)
    .insert({
      lead_id: leadId,
      action,
      description,
      old_value: oldValue || null,
      new_value: newValue || null,
      performed_by: performedBy,
      performed_by_name: performedByName || null,
      metadata: metadata || {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LeadTimeline;
}

// ── Documents ───────────────────────────────────────────────────

export async function getLeadDocuments(leadId: string): Promise<LeadDocument[]> {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadDocument[];
}

export async function addLeadDocument(
  leadId: string,
  doc: {
    file_name: string;
    file_path: string;
    file_url: string;
    file_size?: number;
    document_type?: string;
  },
  uploadedBy: string
): Promise<LeadDocument> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .insert({
      lead_id: leadId,
      file_name: doc.file_name,
      file_path: doc.file_path,
      file_url: doc.file_url,
      file_size: doc.file_size || null,
      document_type: doc.document_type || "general",
      uploaded_by: uploadedBy,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LeadDocument;
}

// ── Search ──────────────────────────────────────────────────────

export async function searchLeads(queryStr: string): Promise<SalesLead[]> {
  const results: SalesLead[] = [];
  const seenIds = new Set<string>();

  const addIfUnique = (lead: SalesLead) => {
    if (seenIds.has(lead.id)) return;
    if (lead.deleted_at) return;
    seenIds.add(lead.id);
    results.push(lead);
  };

  // Exact mobile match
  if (/^\d{7,10}$/.test(queryStr)) {
    const { data } = await supabase
      .from(TABLE)
      .select("*")
      .eq("mobile", queryStr)
      .is("deleted_at", null)
      .limit(10);
    (data ?? []).forEach((d) => addIfUnique(d as SalesLead));
  }

  // Case-insensitive name prefix search
  const { data: nameData } = await supabase
    .from(TABLE)
    .select("*")
    .ilike("customer_name", `${queryStr}%`)
    .is("deleted_at", null)
    .order("customer_name")
    .limit(20);
  (nameData ?? []).forEach((d) => addIfUnique(d as SalesLead));

  return results;
}

// ── Count ───────────────────────────────────────────────────────

export async function getLeadCount(): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ── Follow-ups ──────────────────────────────────────────────────

export async function getTodayFollowUps(userId?: string): Promise<SalesLead[]> {
  const today = new Date().toISOString().split("T")[0];
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("follow_up_date", today)
    .is("deleted_at", null)
    .not("status", "in", '("converted","lost","not_interested")');

  if (userId) {
    query = query.eq("assigned_to", userId);
  }

  const { data, error } = await query.order("customer_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesLead[];
}

export async function getOverdueFollowUps(userId?: string): Promise<SalesLead[]> {
  const today = new Date().toISOString().split("T")[0];
  let query = supabase
    .from(TABLE)
    .select("*")
    .lt("follow_up_date", today)
    .is("deleted_at", null)
    .not("status", "in", '("converted","lost","not_interested")');

  if (userId) {
    query = query.eq("assigned_to", userId);
  }

  const { data, error } = await query.order("follow_up_date");
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesLead[];
}

// ── Assignment ──────────────────────────────────────────────────

export async function reassignLead(
  leadId: string,
  newAssigneeId: string,
  newAssigneeName: string,
  reason: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  await updateLead(leadId, {
    assigned_to: newAssigneeId,
    assigned_to_name: newAssigneeName,
  });

  // Timeline entry is auto-added by the DB trigger, but add reason note
  if (reason) {
    await addTimelineEntry(
      leadId,
      "note_added",
      `Reassignment reason: ${reason}`,
      performedBy,
      performedByName
    );
  }
}

export async function bulkAssignLeads(
  leadIds: string[],
  assigneeId: string,
  assigneeName: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  for (const leadId of leadIds) {
    await reassignLead(leadId, assigneeId, assigneeName, "", performedBy, performedByName);
  }
}

// ── Conversion ──────────────────────────────────────────────────

export async function convertLead(
  leadId: string,
  customerId: string,
  performedBy: string,
  performedByName?: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateLead(leadId, {
    status: "converted" as LeadStatus,
    converted_customer_id: customerId,
    converted_at: now,
  });

  await addTimelineEntry(
    leadId,
    "converted",
    `Lead converted to customer (${customerId})`,
    performedBy,
    performedByName
  );
}

// ── Duplicate Detection ─────────────────────────────────────────

export async function checkDuplicateLead(
  mobile: string,
  email?: string
): Promise<SalesLead[]> {
  const results: SalesLead[] = [];
  const seenIds = new Set<string>();

  // Check by mobile
  const { data: byMobile } = await supabase
    .from(TABLE)
    .select("*")
    .eq("mobile", mobile)
    .is("deleted_at", null)
    .not("status", "in", '("converted","lost")')
    .limit(5);
  (byMobile ?? []).forEach((d) => {
    if (!seenIds.has(d.id)) {
      seenIds.add(d.id);
      results.push(d as SalesLead);
    }
  });

  // Check by email
  if (email && email.trim()) {
    const { data: byEmail } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .is("deleted_at", null)
      .not("status", "in", '("converted","lost")')
      .limit(5);
    (byEmail ?? []).forEach((d) => {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        results.push(d as SalesLead);
      }
    });
  }

  return results;
}

// ── Bulk Import ─────────────────────────────────────────────────

export interface BulkLeadRow {
  customer_name: string;
  mobile: string;
  alt_mobile?: string;
  email?: string;
  source?: string;
  assigned_to: string;
  assigned_to_name?: string;
  priority?: string;
  notes?: string;
  follow_up_date?: string;
}

export interface BulkLeadImportResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export async function bulkCreateLeads(
  rows: BulkLeadRow[],
  createdBy: string,
  createdByName?: string,
  branchId?: string
): Promise<BulkLeadImportResult> {
  const result: BulkLeadImportResult = { created: 0, skipped: 0, errors: [] };

  // Deduplicate within file by mobile
  const seenMobiles = new Set<string>();
  const validRows: (BulkLeadRow & { _rowIndex: number })[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (seenMobiles.has(r.mobile)) {
      result.errors.push({ row: i + 1, reason: `Duplicate mobile in file: ${r.mobile}` });
      result.skipped++;
      continue;
    }
    seenMobiles.add(r.mobile);
    validRows.push({ ...r, _rowIndex: i + 1 });
  }

  if (validRows.length === 0) return result;

  // Reserve UIDs atomically
  const uids = await bulkNextLeadUIDs(validRows.length);
  const now = new Date().toISOString();
  const today = now.split("T")[0];

  // Insert in chunks of 500
  for (let i = 0; i < validRows.length; i += 500) {
    const chunk = validRows.slice(i, i + 500);
    const records = chunk.map((row, idx) => ({
      lead_number: uids[i + idx],
      lead_date: today,
      customer_name: row.customer_name,
      mobile: row.mobile.trim(),
      alt_mobile: row.alt_mobile || null,
      email: row.email ? row.email.toLowerCase().trim() : null,
      source: row.source || "other",
      assigned_to: row.assigned_to,
      assigned_to_name: row.assigned_to_name || null,
      priority: row.priority || "medium",
      status: "new",
      notes: row.notes || null,
      follow_up_date: row.follow_up_date || null,
      branch_id: branchId || null,
      created_by: createdBy,
      created_by_name: createdByName || null,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from(TABLE).insert(records);
    if (error) {
      throw new Error(`Chunk insert failed after ${result.created} created: ${error.message}`);
    }
    result.created += chunk.length;
  }

  return result;
}

// ── Reminders ───────────────────────────────────────────────────

const REMINDERS_TABLE = "lead_reminders";

export async function getLeadReminders(leadId: string): Promise<LeadReminder[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(REMINDERS_TABLE) as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("reminder_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadReminder[];
}

export async function createLeadReminder(
  leadId: string,
  reminder: {
    reminder_type: LeadReminder["reminder_type"];
    reminder_date: string;
    note?: string;
  },
  createdBy: string,
  createdByName?: string
): Promise<LeadReminder> {
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(REMINDERS_TABLE) as any)
    .insert({
      lead_id: leadId,
      reminder_type: reminder.reminder_type,
      reminder_date: reminder.reminder_date,
      note: reminder.note || null,
      status: "pending",
      created_by: createdBy,
      created_by_name: createdByName || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LeadReminder;
}

export async function updateReminderStatus(
  reminderId: string,
  status: LeadReminder["status"]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(REMINDERS_TABLE) as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", reminderId);
  if (error) throw new Error(error.message);
}

export async function deleteLeadReminder(reminderId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(REMINDERS_TABLE) as any)
    .delete()
    .eq("id", reminderId);
  if (error) throw new Error(error.message);
}

export async function getUpcomingReminders(userId?: string): Promise<LeadReminder[]> {
  const today = new Date().toISOString().split("T")[0];
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from(REMINDERS_TABLE) as any)
    .select("*")
    .eq("status", "pending")
    .gte("reminder_date", today)
    .lte("reminder_date", weekAhead)
    .order("reminder_date", { ascending: true })
    .limit(20);
  if (userId) {
    query = query.eq("created_by", userId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadReminder[];
}

// ── Backward-compatible wrapper ─────────────────────────────────

export const leadService = {
  getAll: getLeads,
  getById: getLead,
  create: createLead,
  update: updateLead,
  delete: deleteLead,
  search: searchLeads,
  getCount: getLeadCount,
  getByAssignee: getLeadsByAssignee,
  getTimeline: getLeadTimeline,
  addTimelineEntry,
  getDocuments: getLeadDocuments,
  addDocument: addLeadDocument,
  getTodayFollowUps,
  getOverdueFollowUps,
  reassign: reassignLead,
  bulkAssign: bulkAssignLeads,
  convert: convertLead,
  checkDuplicate: checkDuplicateLead,
  bulkCreate: bulkCreateLeads,
  getReminders: getLeadReminders,
  createReminder: createLeadReminder,
  updateReminderStatus,
  deleteReminder: deleteLeadReminder,
  getUpcomingReminders,
};
