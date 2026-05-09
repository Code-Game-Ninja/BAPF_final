/**
 * GET /api/reconciliation/[runId]
 * Get reconciliation run with all records.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { runId } = await params;
  const db = supabaseAdmin as any;

  const { searchParams } = new URL(req.url);
  const discrepancy_type = searchParams.get("discrepancy_type") ?? "";
  const resolution_status = searchParams.get("resolution_status") ?? "";

  const { data: run, error: runError } = await db
    .from("commission_reconciliation_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  let recordsQuery = db
    .from("commission_reconciliation_records")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (discrepancy_type) recordsQuery = recordsQuery.eq("discrepancy_type", discrepancy_type);
  if (resolution_status) recordsQuery = recordsQuery.eq("resolution_status", resolution_status);

  const { data: records, error: recordsError } = await recordsQuery;

  if (recordsError) {
    return NextResponse.json({ error: recordsError.message }, { status: 500 });
  }

  return NextResponse.json({ ...run, records: records ?? [] });
}
