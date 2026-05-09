/**
 * GET /api/service-desk/business-hours  — get business hours config
 * PUT /api/service-desk/business-hours  — update (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/sla/businessHours";

import { businessHoursSchema } from "@/lib/validations/service-desk";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { data, error } = await supabaseAdmin
    .from("business_hours_config")
    .select("*")
    .order("day_of_week");

  if (error || !data || data.length === 0) {
    return NextResponse.json({ data: DEFAULT_BUSINESS_HOURS });
  }

  return NextResponse.json({ data });
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

  const result = businessHoursSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { day_of_week, start_time, end_time, is_working_day } = result.data;

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("business_hours_config")
    .upsert({
      day_of_week,
      start_time,
      end_time,
      is_working_day: is_working_day ?? true,
      updated_by: caller.uid,
      updated_at: now,
    }, { onConflict: "day_of_week" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("audit_logs").insert({
    action: "config_change",
    module: "business_hours",
    details: `Business hours updated for day ${day_of_week}`,
    user_id: caller.uid,
    user_name: caller.name ?? caller.email,
    user_role: caller.role,
    created_at: now,
  } as any);

  return NextResponse.json(data);
}

