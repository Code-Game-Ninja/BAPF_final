/**
 * PUT  /api/policies/[id]  — Update policy (lock-enforced)
 * DELETE /api/policies/[id] — Delete policy (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

type Params = { params: Promise<{ id: string }> };

// ── GET helper ────────────────────────────────────────────────────────────────

async function getPolicy(id: string) {
  const { data, error } = await supabaseAdmin
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const { id } = await params;
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const policy = await getPolicy(id);
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  // Employees cannot edit locked policies — only remark is allowed
  if (caller.role === "employee" && policy.locked_for_employee) {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { body = {}; }

    const allowedKeys = new Set(["remark", "updated_at"]);
    const attempted = Object.keys(body).filter((k) => !allowedKeys.has(k));
    if (attempted.length > 0) {
      return NextResponse.json(
        { error: `Policy is locked. Employees may only update: remark. Attempted: ${attempted.join(", ")}` },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    // Allow remark-only update
    const { error: remarkError } = await supabaseAdmin
      .from("policies")
      .update({
        remark: (body.remark as string) ?? null,
        remark_updated_by: caller.uid,
        remark_updated_at: now,
        updated_at: now,
      })
      .eq("id", id);
    if (remarkError) {
      console.error("[policies PUT] Remark update failed:", remarkError);
      return NextResponse.json({ error: "Failed to update remark" }, { status: 500 });
    }
    return NextResponse.json({ id });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Allowlist of fields that can be updated on a policy (snake_case for Supabase)
  const ALLOWED_FIELDS = new Set([
    "policy_type", "customer_id", "customer_name",
    "start_date", "end_date", "premium_amount", "sum_insured",
    "insurer_name", "payment_frequency", "assigned_to", "assigned_to_name",
    "remark", "branch_id", "status",
    "verification_confirmed", "locked_for_employee",
    "campaign_id",
  ]);

  const update: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) update[key] = body[key];
  }

  // Employees cannot modify admin-only fields even on unlocked policies
  if (caller.role === "employee") {
    const ADMIN_ONLY = ["locked_for_employee", "verification_confirmed", "status", "assigned_to", "assigned_to_name"];
    for (const field of ADMIN_ONLY) {
      delete update[field];
    }
  }

  // Convert date strings to ISO
  const toISO = (v: unknown): string | unknown =>
    typeof v === "string" || typeof v === "number" ? new Date(v as string).toISOString() : v;

  if (update.start_date) update.start_date = toISO(update.start_date);
  if (update.end_date)   update.end_date   = toISO(update.end_date);

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("policies")
    .update({
      ...update,
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[policies PUT] Update failed:", updateError);
    return NextResponse.json({ error: "Failed to update policy" }, { status: 500 });
  }

  // Audit
  try {
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      action: "policy.update",
      module: "policies",
      details: `Updated policy ${policy.policy_number}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { policy_id: id, policy_number: policy.policy_number, changed_fields: Object.keys(update) },
      created_at: now,
    });
    if (auditError) console.error("[policies PUT] Audit log failed:", auditError);
  } catch (auditErr) {
    console.error("[policies PUT] Audit log failed:", auditErr);
  }

  return NextResponse.json({ id });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  const { id } = await params;
  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const policy = await getPolicy(id);
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin.from("policies").delete().eq("id", id);

  if (deleteError) {
    console.error("[policies DELETE] Delete failed:", deleteError);
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 });
  }

  const now = new Date().toISOString();
  // Audit
  try {
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      action: "policy.delete",
      module: "policies",
      details: `Deleted policy ${policy.policy_number}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: {
        policy_id: id,
        policy_number: policy.policy_number,
        reason: req.nextUrl.searchParams.get("reason") ?? "Admin deletion",
      },
      created_at: now,
    });
    if (auditError) console.error("[policies DELETE] Audit log failed:", auditError);
  } catch (auditErr) {
    console.error("[policies DELETE] Audit log failed:", auditErr);
  }

  return NextResponse.json({ deleted: true });
}
