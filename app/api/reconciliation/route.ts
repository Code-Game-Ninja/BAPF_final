/**
 * GET  /api/reconciliation  — List reconciliation runs
 * POST /api/reconciliation  — Import commission statement (multipart xlsx/csv)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

interface ReconciliationRun {
  id: string;
  insurer_name: string;
  statement_period_start: string;
  statement_period_end: string;
  file_name: string;
  file_path: string;
  status: "processing" | "completed" | "failed";
  total_records?: number;
  matched_count?: number;
  discrepancy_count?: number;
  total_statement_amount?: number;
  total_crm_amount?: number;
  total_discrepancy_amount?: number;
  error_message?: string;
  created_by: string;
  created_at: string;
  completed_at?: string;
}

interface ReconciliationRecord {
  run_id: string;
  policy_id?: string;
  policy_number: string;
  statement_premium?: number;
  statement_commission?: number;
  statement_commission_rate?: number;
  crm_premium?: number;
  crm_commission?: number;
  match_status: "matched" | "discrepancy";
  discrepancy_type?: "policy_not_found" | "amount_mismatch" | "duplicate" | "missing_in_statement";
  discrepancy_amount?: number;
  resolution_status: "unresolved" | "resolved" | "ignored";
  created_at: string;
}

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));

  const { data, count, error } = await supabaseAdmin
    .from("commission_reconciliation_runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const insurer_name = formData.get("insurer_name") as string | null;
  const period_start = formData.get("period_start") as string | null;
  const period_end = formData.get("period_end") as string | null;

  if (!file || !insurer_name || !period_start || !period_end) {
    return NextResponse.json(
      { error: "file, insurer_name, period_start, and period_end are required" },
      { status: 400 }
    );
  }

  // Validate file size (20 MB max)
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be less than 20 MB" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Create reconciliation run record
  const { data: runData, error: runError } = await supabaseAdmin
    .from("commission_reconciliation_runs")
    .insert({
      insurer_name,
      statement_period_start: period_start,
      statement_period_end: period_end,
      file_name: file.name,
      file_path: "",
      status: "processing",
      created_by: caller.uid,
      created_at: now,
    })
    .select()
    .single();

  if (runError || !runData) return NextResponse.json({ error: runError?.message || "Failed to create run" }, { status: 500 });

  const run = runData as ReconciliationRun;

  // Parse file
  let rows: Record<string, unknown>[] = [];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch (parseErr: unknown) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    await supabaseAdmin
      .from("commission_reconciliation_runs")
      .update({ status: "failed", error_message: `Parse error: ${msg}`, completed_at: now })
      .eq("id", run.id);
    return NextResponse.json({ error: "Failed to parse file", details: msg }, { status: 422 });
  }

  // Validate required columns
  if (rows.length > 0) {
    const firstRow = rows[0];
    const keys = Object.keys(firstRow).map((k) => k.toLowerCase().replace(/\s+/g, "_"));
    const required = ["policy_number", "premium_amount", "commission_amount"];
    const missing = required.filter(
      (r) => !keys.some((k) => k.includes(r.replace("_amount", "").replace("_number", "")))
    );
    if (missing.length > 0) {
      await supabaseAdmin
        .from("commission_reconciliation_runs")
        .update({ status: "failed", error_message: `Missing columns: ${missing.join(", ")}`, completed_at: now })
        .eq("id", run.id);
      return NextResponse.json({ error: `Missing required columns: ${missing.join(", ")}` }, { status: 422 });
    }
  }

  // Process rows
  let matched_count = 0;
  let discrepancy_count = 0;
  let total_statement_amount = 0;
  let total_crm_amount = 0;
  let total_discrepancy_amount = 0;
  const seenPolicies = new Set<string>();
  const records: ReconciliationRecord[] = [];

  for (const row of rows) {
    // Normalize column names
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[k.toLowerCase().replace(/[\s\-]/g, "_")] = v;
    }

    const policyNumber =
      String(normalized.policy_number ?? normalized.policy_no ?? normalized.policy ?? "").trim();
    const statementPremium = parseFloat(String(normalized.premium_amount ?? normalized.premium ?? 0));
    const statementCommission = parseFloat(
      String(normalized.commission_amount ?? normalized.commission ?? 0)
    );
    const statementRate = parseFloat(
      String(normalized.commission_rate ?? normalized.rate ?? 0)
    );

    total_statement_amount += statementCommission;

    if (!policyNumber) continue;

    // Check for duplicate in this run
    if (seenPolicies.has(policyNumber)) {
      records.push({
        run_id: run.id,
        policy_number: policyNumber,
        statement_premium: statementPremium,
        statement_commission: statementCommission,
        statement_commission_rate: statementRate,
        match_status: "discrepancy",
        discrepancy_type: "duplicate",
        discrepancy_amount: statementCommission,
        resolution_status: "unresolved",
        created_at: now,
      });
      discrepancy_count++;
      total_discrepancy_amount += statementCommission;
      continue;
    }
    seenPolicies.add(policyNumber);

    // Match policy by policy_number
    const { data: policy } = await supabaseAdmin
      .from("policies")
      .select("id, premium_amount")
      .eq("policy_number", policyNumber)
      .maybeSingle();

    if (!policy) {
      records.push({
        run_id: run.id,
        policy_number: policyNumber,
        statement_premium: statementPremium,
        statement_commission: statementCommission,
        statement_commission_rate: statementRate,
        match_status: "discrepancy",
        discrepancy_type: "policy_not_found",
        discrepancy_amount: statementCommission,
        resolution_status: "unresolved",
        created_at: now,
      });
      discrepancy_count++;
      total_discrepancy_amount += statementCommission;
      continue;
    }

    // Get CRM commission for this policy
    const { data: crmCommission } = await supabaseAdmin
      .from("commissions")
      .select("amount")
      .eq("policy_id", policy.id)
      .maybeSingle();

    const crmAmount = (crmCommission as { amount: number } | null)?.amount ?? 0;
    total_crm_amount += crmAmount;

    // Compare with 1% tolerance
    const tolerance = statementCommission * 0.01;
    const diff = Math.abs(statementCommission - crmAmount);

    if (diff <= tolerance) {
      records.push({
        run_id: run.id,
        policy_id: policy.id,
        policy_number: policyNumber,
        statement_premium: statementPremium,
        statement_commission: statementCommission,
        statement_commission_rate: statementRate,
        crm_premium: (policy as { premium_amount: number }).premium_amount,
        crm_commission: crmAmount,
        match_status: "matched",
        resolution_status: "unresolved",
        created_at: now,
      });
      matched_count++;
    } else {
      records.push({
        run_id: run.id,
        policy_id: policy.id,
        policy_number: policyNumber,
        statement_premium: statementPremium,
        statement_commission: statementCommission,
        statement_commission_rate: statementRate,
        crm_premium: (policy as { premium_amount: number }).premium_amount,
        crm_commission: crmAmount,
        match_status: "discrepancy",
        discrepancy_type: "amount_mismatch",
        discrepancy_amount: diff,
        resolution_status: "unresolved",
        created_at: now,
      });
      discrepancy_count++;
      total_discrepancy_amount += diff;
    }
  }

  // Check for CRM commissions not in statement (missing_in_statement)
  const { data: crmCommissions } = await supabaseAdmin
    .from("commissions")
    .select("id, amount, policy_id, policies!commissions_policy_id_fkey(policy_number, insurer_name)");

  for (const crm of (crmCommissions as any[]) ?? []) {
    const pn = crm.policies?.policy_number;
    if (pn && !seenPolicies.has(pn)) {
      records.push({
        run_id: run.id,
        policy_id: crm.policy_id,
        policy_number: pn,
        crm_commission: crm.amount,
        match_status: "discrepancy",
        discrepancy_type: "missing_in_statement",
        discrepancy_amount: crm.amount,
        resolution_status: "unresolved",
        created_at: now,
      });
      discrepancy_count++;
      total_discrepancy_amount += (crm.amount as number);
    }
  }

  // Insert all records in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await supabaseAdmin.from("commission_reconciliation_records").insert(batch);
  }

  const total_records = matched_count + discrepancy_count;

  // Update run totals
  await supabaseAdmin
    .from("commission_reconciliation_runs")
    .update({
      status: "completed",
      total_records,
      matched_count,
      discrepancy_count,
      total_statement_amount,
      total_crm_amount,
      total_discrepancy_amount,
      completed_at: now,
    })
    .eq("id", run.id);

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create",
      module: "reconciliation",
      details: `Imported commission statement for ${insurer_name}: ${total_records} records, ${matched_count} matched, ${discrepancy_count} discrepancies`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { run_id: run.id, insurer_name, total_records, matched_count, discrepancy_count },
      created_at: now,
    });
  } catch { /* non-critical */ }

  return NextResponse.json(
    {
      run_id: run.id,
      total_records,
      matched_count,
      discrepancy_count,
      total_statement_amount,
      total_crm_amount,
      total_discrepancy_amount,
    },
    { status: 201 }
  );
}
