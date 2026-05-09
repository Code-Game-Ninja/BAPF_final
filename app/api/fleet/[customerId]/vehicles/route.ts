/**
 * GET  /api/fleet/[customerId]/vehicles — list fleet vehicles
 * POST /api/fleet/[customerId]/vehicles — add vehicle manually
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ customerId: string }> };

interface VehicleRequestBody {
  registration_number: string;
  make: string;
  model: string;
  policy_id: string;
  variant?: string;
  fuel_type?: string;
  chassis_number?: string;
  engine_number?: string;
  mfg_year?: string | number;
  seating_capacity?: string | number;
  gvw?: string | number;
  vehicle_category?: string;
  idv?: string | number;
}

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

  let query = supabaseAdmin
    .from("fleet_vehicles")
    .select("*, fleet_drivers(id, name, license_number, license_expiry)", { count: "exact" })
    .eq("customer_id", customerId);

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("vehicle_category", category);
  if (search) {
    query = query.or(`registration_number.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`);
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

  let body: VehicleRequestBody;
  try { 
    body = (await req.json()) as VehicleRequestBody; 
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { registration_number, make, model, policy_id } = body;

  if (!registration_number || !make || !model || !policy_id) {
    return NextResponse.json({ error: "registration_number, make, model, and policy_id are required" }, { status: 400 });
  }

  // Global uniqueness check for registration number
  const { data: existing } = await supabaseAdmin
    .from("fleet_vehicles")
    .select("id")
    .eq("registration_number", registration_number.toUpperCase())
    .neq("status", "Deleted")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: `Registration number ${registration_number} already exists` }, { status: 409 });
  }

  // Validate MFG year
  const mfgYear = body.mfg_year ? Number(body.mfg_year) : null;
  if (mfgYear && (mfgYear < 1900 || mfgYear > new Date().getFullYear())) {
    return NextResponse.json({ error: "MFG year must be between 1900 and current year" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: vehicle, error: insertErr } = await supabaseAdmin
    .from("fleet_vehicles")
    .insert({
      customer_id: customerId,
      policy_id,
      registration_number: registration_number.toUpperCase(),
      make,
      model,
      variant: body.variant || null,
      fuel_type: body.fuel_type || null,
      chassis_number: body.chassis_number || null,
      engine_number: body.engine_number || null,
      mfg_year: mfgYear,
      seating_capacity: body.seating_capacity ? Number(body.seating_capacity) : null,
      gvw: body.gvw ? Number(body.gvw) : null,
      vehicle_category: body.vehicle_category || null,
      idv: body.idv ? Number(body.idv) : null,
      status: "Active",
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (insertErr || !vehicle) return NextResponse.json({ error: insertErr?.message || "Failed to create vehicle" }, { status: 500 });

  // Create endorsement record
  const endKey = "endorsement_counter_FLT";
  const { data: cData } = await supabaseAdmin.from("system_config").select("value").eq("key", endKey).maybeSingle() as { data: { value: unknown } | null };
  const nextEnd = (typeof cData?.value === "number" ? cData.value : 0) + 1;
  await supabaseAdmin.from("system_config").upsert({ key: endKey, value: nextEnd, category: "counters" }, { onConflict: "key" });
  const endNumber = `END-FLT-${String(nextEnd).padStart(5, "0")}`;

  await supabaseAdmin.from("fleet_vehicle_endorsements").insert({
    endorsement_number: endNumber,
    policy_id,
    customer_id: customerId,
    vehicle_id: vehicle.id,
    endorsement_type: "Addition",
    endorsement_date: now.split("T")[0],
    vehicle_details: { registration_number, make, model },
    created_by: caller.uid,
    created_at: now,
  });

  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create", module: "fleet_vehicles",
      details: `Added fleet vehicle: ${registration_number}`,
      user_id: caller.uid, user_name: caller.name ?? caller.email,
      user_role: caller.role, created_at: now,
    });
  } catch { /* non-critical */ }

  return NextResponse.json(vehicle, { status: 201 });
}
