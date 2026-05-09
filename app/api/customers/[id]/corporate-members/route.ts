/**
 * GET  /api/customers/[id]/corporate-members  — list corporate members
 * POST /api/customers/[id]/corporate-members  — add corporate member
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: customerId } = await params;

  const { data: customer, error: custErr } = await supabaseAdmin
    .from("customers")
    .select("id, entity_meta")
    .eq("id", customerId)
    .single();

  if (custErr || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const members = (customer.entity_meta as any)?.members ?? [];
  return NextResponse.json({ data: members });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: customerId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: customer, error: custErr } = await supabaseAdmin
    .from("customers")
    .select("id, entity_meta")
    .eq("id", customerId)
    .single();

  if (custErr || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const existingMeta = (customer.entity_meta as any) || {};
  const existingMembers = existingMeta.members || [];

  const newMember = {
    id: crypto.randomUUID(),
    name: String(body.name).trim(),
    designation: (body.designation as string) || null,
    department: (body.department as string) || null,
    email: (body.email as string) || null,
    mobile: (body.mobile as string) || null,
    role: (body.role as string) || null,
    branch_location: (body.branch_location as string) || null,
    notes: (body.notes as string) || null,
    created_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabaseAdmin
    .from("customers")
    .update({
      entity_meta: { ...existingMeta, members: [...existingMembers, newMember] },
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Audit log (best-effort)
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create",
      module: "customers",
      details: `Added corporate member: ${body.name} to customer ${customerId}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { customer_id: customerId, member_name: body.name },
      created_at: new Date().toISOString(),
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(newMember, { status: 201 });
}
