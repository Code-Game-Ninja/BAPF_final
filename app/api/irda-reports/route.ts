/**
 * GET  /api/irda-reports  — List generated reports
 * POST /api/irda-reports  — Generate IRDA report (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;

  const { data, error } = await db
    .from("irda_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { report_type, period_type, period_start, period_end, file_format } = body;

  const validTypes = ["business_summary", "premium_register", "commission_register", "claims_register"];
  const validPeriods = ["monthly", "quarterly", "annual"];
  const validFormats = ["excel", "pdf"];

  if (!report_type || !validTypes.includes(report_type)) {
    return NextResponse.json({ error: "Invalid report_type" }, { status: 400 });
  }
  if (!period_type || !validPeriods.includes(period_type)) {
    return NextResponse.json({ error: "Invalid period_type" }, { status: 400 });
  }
  if (!period_start || !period_end) {
    return NextResponse.json({ error: "period_start and period_end are required" }, { status: 400 });
  }
  if (!file_format || !validFormats.includes(file_format)) {
    return NextResponse.json({ error: "file_format must be excel or pdf" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Generate report data
  let reportData: any[][] = [];
  let sheetName = "Report";

  if (report_type === "business_summary") {
    const { data: policies } = await supabaseAdmin
      .from("policies")
      .select("policy_type, premium_amount, status")
      .gte("created_at", period_start)
      .lte("created_at", period_end + "T23:59:59Z");

    const byType: Record<string, { count: number; premium: number }> = {};
    for (const p of policies ?? []) {
      const t = p.policy_type ?? "other";
      if (!byType[t]) byType[t] = { count: 0, premium: 0 };
      byType[t].count++;
      byType[t].premium += p.premium_amount ?? 0;
    }

    reportData = [
      ["IRDA Business Summary Report"],
      ["Period", `${period_start} to ${period_end}`],
      ["Generated", now],
      [""],
      ["Policy Type", "Count", "Total Premium"],
      ...Object.entries(byType).map(([type, data]) => [type, data.count, data.premium]),
      [""],
      ["TOTAL", (policies ?? []).length, (policies ?? []).reduce((s, p) => s + (p.premium_amount ?? 0), 0)],
    ];
    sheetName = "Business Summary";
  } else if (report_type === "premium_register") {
    const { data: policies } = await supabaseAdmin
      .from("policies")
      .select("policy_number, policy_type, customer_name, insurer_name, premium_amount, start_date, end_date, status")
      .gte("created_at", period_start)
      .lte("created_at", period_end + "T23:59:59Z");

    reportData = [
      ["IRDA Premium Register"],
      ["Period", `${period_start} to ${period_end}`],
      ["Generated", now],
      [""],
      ["Policy Number", "Type", "Customer", "Insurer", "Premium", "Start Date", "End Date", "Status"],
      ...(policies ?? []).map((p) => [
        p.policy_number, p.policy_type, p.customer_name, p.insurer_name ?? "",
        p.premium_amount, p.start_date, p.end_date, p.status,
      ]),
    ];
    sheetName = "Premium Register";
  } else if (report_type === "commission_register") {
    const { data: commissions } = await supabaseAdmin
      .from("commissions")
      .select("amount, status, paid_date, policies!commissions_policy_id_fkey(policy_number, policy_type, insurer_name, customer_name)")
      .gte("created_at", period_start)
      .lte("created_at", period_end + "T23:59:59Z");

    reportData = [
      ["IRDA Commission Register"],
      ["Period", `${period_start} to ${period_end}`],
      ["Generated", now],
      [""],
      ["Policy Number", "Type", "Insurer", "Customer", "Commission Amount", "Status", "Paid Date"],
      ...(commissions ?? []).map((c: any) => [
        c.policies?.policy_number ?? "", c.policies?.policy_type ?? "",
        c.policies?.insurer_name ?? "", c.policies?.customer_name ?? "",
        c.amount, c.status, c.paid_date ?? "",
      ]),
    ];
    sheetName = "Commission Register";
  } else if (report_type === "claims_register") {
    const { data: claims } = await supabaseAdmin
      .from("claims")
      .select("claim_number, claim_type, customer_name, claim_amount, settled_amount, status, claim_date, settlement_date, insurer_name")
      .gte("created_at", period_start)
      .lte("created_at", period_end + "T23:59:59Z");

    reportData = [
      ["IRDA Claims Register"],
      ["Period", `${period_start} to ${period_end}`],
      ["Generated", now],
      [""],
      ["Claim Number", "Type", "Customer", "Claim Amount", "Settled Amount", "Status", "Claim Date", "Settlement Date", "Insurer"],
      ...(claims ?? []).map((c: any) => [
        c.claim_number, c.claim_type, c.customer_name, c.claim_amount,
        c.settled_amount ?? "", c.status, c.claim_date, c.settlement_date ?? "", c.insurer_name ?? "",
      ]),
    ];
    sheetName = "Claims Register";
  }

  // Generate Excel file
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(reportData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

  // Store report record (file_url would be a storage URL in production)
  const fileName = `irda-${report_type}-${period_start}-${period_end}.xlsx`;
  const fileUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${buffer}`;

  const { data: report, error: insertError } = await db
    .from("irda_reports")
    .insert({
      report_type,
      period_type,
      period_start,
      period_end,
      file_url: fileUrl,
      file_path: fileName,
      file_format,
      generated_by: caller.uid,
      generated_by_name: caller.name ?? caller.email,
      created_at: now,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create",
      module: "irda_reports",
      details: `Generated IRDA ${report_type} report for ${period_start} to ${period_end}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { report_id: report.id, report_type, period_start, period_end },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(report, { status: 201 });
}
