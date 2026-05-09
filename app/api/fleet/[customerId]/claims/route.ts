/**
 * GET  /api/fleet/[customerId]/claims — list fleet claims
 * POST /api/fleet/[customerId]/claims — register fleet claim
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ customerId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;

  const { data, error } = await supabaseAdmin
    .from("claims")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { policy_id, vehicle_id, claim_amount, claim_type, accident_details } = body as any;

  if (!policy_id || !claim_amount) {
    return NextResponse.json({ error: "policy_id and claim_amount are required" }, { status: 400 });
  }

  // Validate active policy
  const { data: policy } = await supabaseAdmin
    .from("policies")
    .select("id, status, assigned_to")
    .eq("id", policy_id)
    .single();

  if (!policy || policy.status !== "active") {
    return NextResponse.json({ error: "Policy must be active to register a claim" }, { status: 400 });
  }

  // Generate claim number
  const { data: counterData } = await supabaseAdmin
    .from("system_config").select("value").eq("key", "claim_counter_flt").maybeSingle();
  const next = (typeof counterData?.value === "number" ? counterData.value : 0) + 1;
  await supabaseAdmin.from("system_config").upsert({ key: "claim_counter_flt", value: next, category: "counters" }, { onConflict: "key" });
  const claimNumber = `CLM-FLT-${String(next).padStart(5, "0")}`;

  const now = new Date().toISOString();
  const { data: claim, error: insertErr } = await supabaseAdmin
    .from("claims")
    .insert({
      claim_number: claimNumber,
      policy_id,
      customer_id: customerId,
      claim_type: claim_type || "own_damage",
      claim_amount: Number(claim_amount),
      status: "registered",
      claim_date: now.split("T")[0],
      incident_description: accident_details || null,
      surveyor_name: (body.surveyor_name as string) || null,
      surveyor_phone: (body.surveyor_phone as string) || null,
      created_by: caller.uid,
      customer_name: "",
    } as any)
    .select()
    .single() as any;

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Notify assigned RM
  if (policy.assigned_to) {
    await supabaseAdmin.from("notifications").insert({
      user_id: policy.assigned_to,
      title: "New Fleet Claim Registered",
      message: `Claim ${claimNumber} registered for policy ${policy_id}`,
      type: "claim_update",
      link: `/dashboard/claims/${claim.id}`,
      read: false,
      created_at: now,
      updated_at: now,
    } as any);
  }

  return NextResponse.json(claim, { status: 201 });
}
