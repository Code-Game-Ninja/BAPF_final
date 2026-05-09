/**
 * PUT    /api/gmc/[customerId]/members/[id]  — update member
 * DELETE /api/gmc/[customerId]/members/[id]  — delete member (creates endorsement)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

// Cast to any to support Phase 3 tables not yet in database.types.ts
const db = supabaseAdmin as any;

type Params = { params: Promise<{ customerId: string; id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId, id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (body.name !== undefined) updates.name = body.name;
  if (body.mobile !== undefined) updates.mobile = body.mobile;
  if (body.email !== undefined) updates.email = body.email;
  if (body.address !== undefined) updates.address = body.address;
  if (body.department !== undefined) updates.department = body.department;
  if (body.designation !== undefined) updates.designation = body.designation;

  const { data, error } = await db
    .from("gmc_members")
    .update(updates)
    .eq("id", id)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update", module: "gmc_members",
      details: `Updated GMC member: ${id}`,
      user_id: caller.uid, user_name: caller.name ?? caller.email,
      user_role: caller.role, created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId, id } = await params;

  const { data: member, error: fetchErr } = await db
    .from("gmc_members")
    .select("*")
    .eq("id", id)
    .eq("customer_id", customerId)
    .single();

  if (fetchErr || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Soft delete member
  await db.from("gmc_members").update({
    status: "Deleted", deleted_at: now, updated_at: now,
  }).eq("id", id);

  // Cascade: delete dependents
  await db.from("gmc_members").update({
    status: "Deleted", deleted_at: now, updated_at: now,
  }).eq("parent_member_id", id);

  // Create endorsement record
  const endNumber = await getNextEndorsementNumber("GMC");
  await db.from("gmc_member_endorsements").insert({
    endorsement_number: endNumber,
    policy_id: member.policy_id,
    customer_id: customerId,
    member_id: id,
    endorsement_type: "Deletion",
    endorsement_date: now.split("T")[0],
    member_details: { employee_id: member.employee_id, name: member.name },
    created_by: caller.uid,
    created_at: now,
  });

  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "delete", module: "gmc_members",
      details: `Deleted GMC member: ${member.name} (${member.employee_id})`,
      user_id: caller.uid, user_name: caller.name ?? caller.email,
      user_role: caller.role, created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, endorsement_number: endNumber });
}

async function getNextEndorsementNumber(type: "GMC" | "FLT"): Promise<string> {
  const key = `endorsement_counter_${type}`;
  const { data } = await supabaseAdmin.from("system_config").select("value").eq("key", key).maybeSingle();
  const current = typeof data?.value === "number" ? data.value : 0;
  const next = current + 1;
  await supabaseAdmin.from("system_config").upsert({ key, value: next, category: "counters" }, { onConflict: "key" });
  return `END-${type}-${String(next).padStart(5, "0")}`;
}
