/**
 * POST /api/reconciliation/[runId]/bulk-resolve
 * Bulk resolve discrepancies by type.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { runId } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { discrepancy_type, resolution, notes } = body;
  const validResolutions = ["accept_statement", "accept_crm", "escalate"];

  if (!resolution || !validResolutions.includes(resolution)) {
    return NextResponse.json(
      { error: "resolution must be one of: accept_statement, accept_crm, escalate" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  let query = db
    .from("commission_reconciliation_records")
    .select("id, policy_id, statement_commission, policy_number")
    .eq("run_id", runId)
    .eq("match_status", "discrepancy")
    .eq("resolution_status", "unresolved");

  if (discrepancy_type) {
    query = query.eq("discrepancy_type", discrepancy_type);
  }

  const { data: records, error: fetchError } = await query;
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  let resolved = 0;
  for (const record of records ?? []) {
    const updatePayload: any = {
      resolution_status: resolution === "escalate" ? "escalated" : resolution,
      resolved_by: caller.uid,
      resolved_at: now,
      resolution_notes: notes ?? null,
    };

    if (resolution === "accept_statement" && record.policy_id && record.statement_commission) {
      await supabaseAdmin
        .from("commissions")
        .update({ amount: record.statement_commission })
        .eq("policy_id", record.policy_id);
    }

    await db
      .from("commission_reconciliation_records")
      .update(updatePayload)
      .eq("id", record.id);

    resolved++;
  }

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update",
      module: "reconciliation",
      details: `Bulk resolved ${resolved} discrepancies in run ${runId} with action: ${resolution}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { run_id: runId, discrepancy_type, resolution, resolved_count: resolved },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json({ resolved });
}
