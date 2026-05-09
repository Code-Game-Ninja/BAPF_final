/**
 * GET /api/service-desk/sla-config  — get SLA config
 * PUT /api/service-desk/sla-config  — update SLA config (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

import { slaConfigSchema } from "@/lib/validations/service-desk";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { data, error } = await supabaseAdmin
    .from("sla_config")
    .select("*")
    .order("category")
    .order("priority");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = slaConfigSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { category, priority, sla_hours } = result.data;

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("sla_config")
    .upsert({ category, priority, sla_hours, updated_by: caller.uid, updated_at: now }, { onConflict: "category,priority" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabaseAdmin.from("audit_logs").insert({
    action: "config_change",
    module: "sla_config",
    details: `SLA config updated: ${category}/${priority} → ${sla_hours}h`,
    user_id: caller.uid,
    user_name: caller.name ?? caller.email,
    user_role: caller.role,
    created_at: now,
  } as any);

  return NextResponse.json(data);
}

