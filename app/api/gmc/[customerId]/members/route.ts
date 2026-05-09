/**
 * GET  /api/gmc/[customerId]/members  — list GMC members
 * POST /api/gmc/[customerId]/members  — add member manually
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

// Cast to any to support Phase 3 tables not yet in database.types.ts
const db = supabaseAdmin as any;

type Params = { params: Promise<{ customerId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const department = searchParams.get("department") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

  let query = db
    .from("gmc_members")
    .select("*", { count: "exact" })
    .eq("customer_id", customerId);

  if (status) query = query.eq("status", status);
  if (department) query = query.eq("department", department);
  if (search) {
    query = query.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%,mobile.ilike.%${search}%`);
  }

  query = query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { employee_id, name, member_type = "employee", policy_id, parent_member_id } = body as any;

  if (!employee_id || !name || !policy_id) {
    return NextResponse.json({ error: "employee_id, name, and policy_id are required" }, { status: 400 });
  }

  // Uniqueness check: employee_id within customer
  const { data: existing } = await db
    .from("gmc_members")
    .select("id")
    .eq("customer_id", customerId)
    .eq("employee_id", employee_id)
    .neq("status", "Deleted")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: `Employee ID ${employee_id} already exists for this customer` }, { status: 409 });
  }

  // Dependent linkage check
  if (member_type === "dependent") {
    if (!parent_member_id) {
      return NextResponse.json({ error: "parent_member_id is required for dependents" }, { status: 400 });
    }
    const { data: parent } = await db
      .from("gmc_members")
      .select("id, status")
      .eq("id", parent_member_id)
      .single();

    if (!parent || parent.status !== "Active") {
      return NextResponse.json({ error: "Parent employee must be active" }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const { data: member, error: insertErr } = await db
    .from("gmc_members")
    .insert({
      customer_id: customerId,
      policy_id,
      employee_id,
      name,
      member_type,
      parent_member_id: parent_member_id || null,
      dob: (body.dob as string) || null,
      gender: (body.gender as string) || null,
      mobile: (body.mobile as string) || null,
      email: (body.email as string) || null,
      department: (body.department as string) || null,
      designation: (body.designation as string) || null,
      address: (body.address as string) || null,
      status: "Active",
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Create endorsement record for addition
  const endCounter = await getNextEndorsementNumber("GMC");
  await db.from("gmc_member_endorsements").insert({
    endorsement_number: endCounter,
    policy_id,
    customer_id: customerId,
    member_id: member.id,
    endorsement_type: "Addition",
    endorsement_date: now.split("T")[0],
    member_details: { employee_id, name, member_type },
    created_by: caller.uid,
    created_at: now,
  });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create", module: "gmc_members",
      details: `Added GMC member: ${name} (${employee_id})`,
      user_id: caller.uid, user_name: caller.name ?? caller.email,
      user_role: caller.role, created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(member, { status: 201 });
}

async function getNextEndorsementNumber(type: "GMC" | "FLT"): Promise<string> {
  const key = `endorsement_counter_${type}`;
  const { data } = await supabaseAdmin.from("system_config").select("value").eq("key", key).maybeSingle();
  const current = typeof data?.value === "number" ? data.value : 0;
  const next = current + 1;
  await supabaseAdmin.from("system_config").upsert({ key, value: next, category: "counters" }, { onConflict: "key" });
  return `END-${type}-${String(next).padStart(5, "0")}`;
}
