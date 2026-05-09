/**
 * GET  /api/commission-rates  — List commission rates
 * POST /api/commission-rates  — Create rate (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api/error";
import { commissionRateSchema } from "@/lib/validations/commission";

interface CommissionRate {
  id: string;
  insurer_name: string;
  policy_type: string;
  rate_type: "percentage" | "flat";
  rate_value: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { searchParams } = new URL(req.url);
  const insurer = searchParams.get("insurer") ?? "";
  const policy_type = searchParams.get("policy_type") ?? "";
  const active_only = searchParams.get("active_only") !== "false";

  let query = supabaseAdmin
    .from("commission_rates")
    .select("*")
    .order("insurer_name", { ascending: true })
    .order("policy_type", { ascending: true });

  if (insurer) query = query.ilike("insurer_name", `%${insurer}%`);
  if (policy_type) query = query.eq("policy_type", policy_type);
  if (active_only) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = commissionRateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const {
    insurer_name,
    policy_type,
    rate_type,
    rate_value,
    effective_from,
    effective_to,
    is_active
  } = result.data;

  const now = new Date().toISOString();

  const { data: created, error } = await supabaseAdmin
    .from("commission_rates")
    .insert({
      insurer_name,
      policy_type,
      rate_type,
      rate_value,
      effective_from: effective_from ?? new Date().toISOString().split("T")[0],
      effective_to: effective_to ?? null,
      is_active: is_active ?? true,
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !created) {
    return errorResponse(error?.message || "Failed to create commission rate", 500);
  }

  const rate = created as CommissionRate;

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create",
      module: "commission_rates",
      details: `Created commission rate: ${insurer_name} / ${policy_type} = ${rate_value}${rate_type === "percentage" ? "%" : " flat"}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { rate_id: rate.id, insurer_name, policy_type, rate_type, rate_value },
      created_at: now,
    });
  } catch (auditErr) {
    console.error("[commission-rates] Audit log failed:", auditErr);
  }

  return NextResponse.json(rate, { status: 201 });
}
