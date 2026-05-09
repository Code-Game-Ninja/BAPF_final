/**
 * PUT /api/reconciliation/[runId]/records/[rid]/resolve
 * Resolve a discrepancy: accept_statement / accept_crm / escalate
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; rid: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { runId, rid } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { resolution, notes } = body;
  const validResolutions = ["accept_statement", "accept_crm", "escalate"];

  if (!resolution || !validResolutions.includes(resolution)) {
    return NextResponse.json(
      { error: "resolution must be one of: accept_statement, accept_crm, escalate" },
      { status: 400 }
    );
  }

  // Fetch the record
  const { data: record, error: fetchError } = await db
    .from("commission_reconciliation_records")
    .select("*")
    .eq("id", rid)
    .eq("run_id", runId)
    .single();

  if (fetchError || !record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const updatePayload: any = {
    resolution_status: resolution === "escalate" ? "escalated" : resolution,
    resolved_by: caller.uid,
    resolved_at: now,
    resolution_notes: notes ?? null,
  };

  // Handle accept_statement: update CRM commission to statement amount
  if (resolution === "accept_statement" && record.policy_id && record.statement_commission) {
    await supabaseAdmin
      .from("commissions")
      .update({ amount: record.statement_commission })
      .eq("policy_id", record.policy_id);
  }

  // Handle escalate: create a service ticket
  if (resolution === "escalate") {
    try {
      const { data: ticket } = await supabaseAdmin
        .from("service_tickets" as any)
        .insert({
          ticket_number: `TKT-RECON-${Date.now()}`,
          category: "invoice_dispute",
          priority: "high",
          status: "open",
          description: `Commission discrepancy for policy ${record.policy_number}: CRM=${record.crm_commission}, Statement=${record.statement_commission}`,
          metadata: { reconciliation_record_id: rid, run_id: runId },
          created_by: caller.uid,
          created_at: now,
        } as any)
        .select("id")
        .single();

      if (ticket && typeof ticket === "object" && "id" in ticket) {
        updatePayload.service_ticket_id = (ticket as any).id;
      }
    } catch { /* non-critical */ }
  }

  const { data: updated, error } = await db
    .from("commission_reconciliation_records")
    .update(updatePayload)
    .eq("id", rid)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update",
      module: "reconciliation",
      details: `Resolved discrepancy ${rid} with action: ${resolution}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { record_id: rid, run_id: runId, resolution },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(updated);
}
