/**
 * Supabase Invoice & Ledger Service — Full CRUD
 */
import { supabase } from "@/lib/supabase/client";
import type { Invoice, InvoiceItem, LedgerEntry } from "@/lib/types";

// ── Auto-numbering ──
export async function getNextInvoiceNumber(prefix = "INV"): Promise<string> {
  const resolvedPrefix = prefix.trim().toUpperCase();
  const { count } = await supabase.from("invoices")
    .select("*", { count: "exact", head: true });
  const next = (count ?? 0) + 1;
  return `${resolvedPrefix}-${String(next).padStart(5, "0")}`;
}

// ── Due date helper ──
export function calcInvoiceDueDate(dueDays = 15): string {
  const d = new Date();
  d.setDate(d.getDate() + dueDays);
  return d.toISOString().split("T")[0];
}


async function listInvoices(filters?: {
  status?: string;
  customer_id?: string;
  search?: string;
}) {
  let query = supabase.from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.search)
    query = query.or(
      `customer_name.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`
    );
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

async function getInvoiceById(id: string) {
  const { data, error } = await supabase.from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Invoice;
}

async function createInvoice(
  invoice: Partial<Invoice>,
  items?: Partial<InvoiceItem>[]
) {
  const { data, error } = await supabase.from("invoices")
    .insert(invoice)
    .select()
    .single();
  if (error) throw error;
  const created = data as Invoice;

  if (items && items.length > 0) {
    const itemsWithInvoiceId = items.map((item) => ({
      ...item,
      invoice_id: created.id,
    }));
    await supabase.from("invoice_items").insert(itemsWithInvoiceId);
  }

  return created;
}

async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const { data, error } = await supabase.from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Invoice;
}

async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

async function markAsPaid(
  id: string,
  paymentMethod?: string,
  reference?: string
) {
  const invoice = await getInvoiceById(id);
  const { data, error } = await supabase.from("invoices")
    .update({
      status: "paid",
      paid_amount: invoice.total_amount,
      paid_date: new Date().toISOString().split("T")[0],
      payment_method: paymentMethod,
      payment_reference: reference,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Invoice;
}

// ── Invoice Items ──
async function getInvoiceItems(invoiceId: string) {
  const { data, error } = await supabase.from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as InvoiceItem[];
}

async function addInvoiceItem(item: Partial<InvoiceItem>) {
  const { data, error } = await supabase.from("invoice_items")
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  // Recalculate subtotal
  if (item.invoice_id) {
    const items = await getInvoiceItems(item.invoice_id);
    const subtotal = items.reduce(
      (s: number, i: InvoiceItem) => s + ((i.amount as number) || 0),
      0
    );
    await updateInvoice(item.invoice_id, { subtotal });
  }
  return data as InvoiceItem;
}

async function deleteInvoiceItem(id: string, invoiceId: string) {
  const { error } = await supabase.from("invoice_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
  // Recalculate subtotal
  const items = await getInvoiceItems(invoiceId);
  const subtotal = items.reduce(
    (s: number, i: InvoiceItem) => s + ((i.amount as number) || 0),
    0
  );
  await updateInvoice(invoiceId, { subtotal });
}

// ── Stats ──
async function getInvoiceStats() {
  const { data, error } = await supabase.from("invoices")
    .select("status, total_amount, paid_amount, balance_due");
  if (error) throw error;
  const invoices = (data ?? []) as Invoice[];
  const total = invoices.length;
  const totalAmount = invoices.reduce(
    (s, i) => s + ((i.total_amount as number) || 0),
    0
  );
  const paidAmount = invoices.reduce(
    (s, i) => s + ((i.paid_amount as number) || 0),
    0
  );
  const pendingAmount = invoices.reduce(
    (s, i) => s + ((i.balance_due as number) || 0),
    0
  );
  const byStatus: Record<string, number> = {};
  invoices.forEach((i) => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });
  return { total, totalAmount, paidAmount, pendingAmount, byStatus };
}

// ══════════════════════════════════════════
// LEDGER ENTRIES
// ══════════════════════════════════════════

async function listLedgerEntries(filters?: {
  customer_id?: string;
  category?: string;
  entry_type?: string;
  search?: string;
}) {
  let query = supabase.from("ledger_entries")
    .select("*")
    .order("entry_date", { ascending: false });
  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.entry_type) query = query.eq("entry_type", filters.entry_type);
  if (filters?.search)
    query = query.or(
      `description.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
    );
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LedgerEntry[];
}

async function createLedgerEntry(entry: Partial<LedgerEntry>) {
  const { data, error } = await supabase.from("ledger_entries")
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data as LedgerEntry;
}

async function updateLedgerEntry(id: string, updates: Partial<LedgerEntry>) {
  const { data, error } = await supabase.from("ledger_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as LedgerEntry;
}

async function deleteLedgerEntry(id: string) {
  const { error } = await supabase.from("ledger_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

async function getLedgerBalance(customerId?: string) {
  let query = supabase.from("ledger_entries").select("entry_type, amount");
  if (customerId) query = query.eq("customer_id", customerId);
  const { data, error } = await query;
  if (error) throw error;
  const entries = (data ?? []) as LedgerEntry[];
  const debits = entries
    .filter((e) => e.entry_type === "debit")
    .reduce((s, e) => s + ((e.amount as number) || 0), 0);
  const credits = entries
    .filter((e) => e.entry_type === "credit")
    .reduce((s, e) => s + ((e.amount as number) || 0), 0);
  return { debits, credits, balance: debits - credits };
}

export const invoiceService = {
  list: listInvoices,
  getById: getInvoiceById,
  create: createInvoice,
  update: updateInvoice,
  delete: deleteInvoice,
  markAsPaid,
  getItems: getInvoiceItems,
  addItem: addInvoiceItem,
  deleteItem: deleteInvoiceItem,
  getStats: getInvoiceStats,
  getNextNumber: getNextInvoiceNumber,
  calcDueDate: calcInvoiceDueDate,
};

export const ledgerService = {
  list: listLedgerEntries,
  create: createLedgerEntry,
  update: updateLedgerEntry,
  delete: deleteLedgerEntry,
  getBalance: getLedgerBalance,
};
