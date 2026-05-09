/**
 * GET /api/reconciliation/[runId]/report
 * Download reconciliation report as Excel.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { runId } = await params;
  const db = supabaseAdmin as any;

  const { data: run } = await db
    .from("commission_reconciliation_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const { data: records } = await db
    .from("commission_reconciliation_records")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  // Build Excel workbook
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ["Reconciliation Report"],
    [""],
    ["Insurer", run.insurer_name],
    ["Period", `${run.statement_period_start} to ${run.statement_period_end}`],
    ["File", run.file_name],
    ["Status", run.status],
    ["Generated At", new Date().toISOString()],
    [""],
    ["Summary"],
    ["Total Records", run.total_records],
    ["Matched", run.matched_count],
    ["Discrepancies", run.discrepancy_count],
    ["Total Statement Amount", run.total_statement_amount],
    ["Total CRM Amount", run.total_crm_amount],
    ["Total Discrepancy Amount", run.total_discrepancy_amount],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Records sheet
  const recordRows = [
    [
      "Policy Number",
      "Match Status",
      "Discrepancy Type",
      "Statement Commission",
      "CRM Commission",
      "Discrepancy Amount",
      "Resolution Status",
      "Resolution Notes",
    ],
    ...(records ?? []).map((r: any) => [
      r.policy_number ?? "",
      r.match_status,
      r.discrepancy_type ?? "",
      r.statement_commission ?? "",
      r.crm_commission ?? "",
      r.discrepancy_amount ?? "",
      r.resolution_status,
      r.resolution_notes ?? "",
    ]),
  ];
  const recordsSheet = XLSX.utils.aoa_to_sheet(recordRows);
  XLSX.utils.book_append_sheet(wb, recordsSheet, "Records");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reconciliation-${runId}.xlsx"`,
    },
  });
}
