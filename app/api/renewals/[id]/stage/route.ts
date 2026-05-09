/**
 * PUT /api/renewals/[id]/stage
 * Update renewal stage with validation (no backward from renewed/lost).
 * Records stage history and audit log.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

const STAGE_ORDER = ["due", "contacted", "negotiating", "renewed", "lost"] as const;
type Stage = (typeof STAGE_ORDER)[number];

const TERMINAL_STAGES: Stage[] = ["renewed", "lost"];

function isValidTransition(from: Stage, to: Stage): boolean {
  // Cannot go backward from terminal stages
  if (TERMINAL_STAGES.includes(from)) return false;
  // Cannot go backward in general (except to lost from any non-terminal)
  if (to === "lost") return true;
  const fromIdx = STAGE_ORDER.indexOf(from);
  const toIdx = STAGE_ORDER.indexOf(to);
  return toIdx > fromIdx;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stage, notes, lost_reason } = body;

  if (!stage || !STAGE_ORDER.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage value" }, { status: 400 });
  }

  if (stage === "lost" && !lost_reason) {
    return NextResponse.json({ error: "lost_reason is required when stage is lost" }, { status: 400 });
  }

  // Fetch current renewal
  const { data: renewal, error: fetchError } = await db
    .from("renewal_pipeline")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !renewal) {
    return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
  }

  const currentStage = renewal.stage as Stage;

  if (!isValidTransition(currentStage, stage as Stage)) {
    return NextResponse.json(
      {
        error: `Cannot transition from '${currentStage}' to '${stage}'. Stage cannot go backward from terminal stages.`,
      },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();

  // Update renewal stage
  const updatePayload: any = {
    stage,
    stage_updated_at: now,
    updated_at: now,
  };

  if (stage === "lost" && lost_reason) {
    updatePayload.lost_reason = lost_reason;
  }

  if (stage === "contacted" || stage === "negotiating") {
    updatePayload.last_contact_date = now;
  }

  const { data: updated, error: updateError } = await db
    .from("renewal_pipeline")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Insert stage history
  await db.from("renewal_stage_history").insert({
    renewal_id: id,
    from_stage: currentStage,
    to_stage: stage,
    changed_by: caller.uid,
    changed_by_name: caller.name ?? caller.email,
    notes: notes ?? null,
    created_at: now,
  });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update",
      module: "renewals",
      details: `Stage updated from '${currentStage}' to '${stage}' for renewal ${id}${lost_reason ? ` — reason: ${lost_reason}` : ""}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { renewal_id: id, from_stage: currentStage, to_stage: stage },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(updated);
}
