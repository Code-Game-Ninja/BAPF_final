/**
 * POST /api/policies/[id]/lock
 * ─────────────────────────────────────────────────────────────────────────────
 * Toggle or force the locked_for_employee flag.
 * Admin and manager only.
 *
 * Body: { lock?: boolean }
 *   - If `lock` is true  → lock the policy for employees
 *   - If `lock` is false → unlock
 *   - If omitted         → toggle current state
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const { id } = await params;
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { data: policy, error } = await supabaseAdmin
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  let body: { lock?: boolean } = {};
  try { body = await req.json(); } catch { /* omitted body = toggle */ }

  const newLocked = typeof body.lock === "boolean" ? body.lock : !policy.locked_for_employee;
  const now = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("policies")
    .update({
      locked_for_employee: newLocked,
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[lock] Failed to update policy:", updateError);
    return NextResponse.json({ error: "Failed to update policy lock state" }, { status: 500 });
  }

  try {
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      action: newLocked ? "policy.lock" : "policy.unlock",
      module: "policies",
      details: `${newLocked ? "Locked" : "Unlocked"} policy ${policy.policy_number} for employees`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { policy_id: id, policy_number: policy.policy_number, locked: newLocked },
      created_at: now,
    });
    if (auditError) console.error("[lock] Audit log failed:", auditError);
  } catch (auditErr) {
    console.error("[lock] Audit log failed:", auditErr);
  }

  return NextResponse.json({ id, locked_for_employee: newLocked });
}
