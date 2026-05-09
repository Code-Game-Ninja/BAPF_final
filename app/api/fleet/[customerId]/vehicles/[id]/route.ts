/**
 * PUT    /api/fleet/[customerId]/vehicles/[id]  — update vehicle
 * DELETE /api/fleet/[customerId]/vehicles/[id]  — delete vehicle (creates endorsement)
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

  const allowed = ["make", "model", "variant", "fuel_type", "idv", "primary_driver_id",
    "chassis_number", "engine_number", "seating_capacity", "gvw", "vehicle_category"];
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Validate primary driver uniqueness
  if (body.primary_driver_id) {
    const { data: otherVehicle } = await db
      .from("fleet_vehicles")
      .select("id")
      .eq("primary_driver_id", body.primary_driver_id)
      .neq("id", id)
      .neq("status", "Deleted")
      .limit(1);

    if (otherVehicle && otherVehicle.length > 0) {
      return NextResponse.json(
        { error: "This driver is already assigned as primary driver to another vehicle" },
        { status: 409 }
      );
    }
  }

  const { data, error } = await db
    .from("fleet_vehicles")
    .update(updates)
    .eq("id", id)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update", module: "fleet_vehicles",
      details: `Updated fleet vehicle: ${id}`,
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

  const { data: vehicle, error: fetchErr } = await db
    .from("fleet_vehicles")
    .select("*")
    .eq("id", id)
    .eq("customer_id", customerId)
    .single();

  if (fetchErr || !vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Soft delete
  await db.from("fleet_vehicles").update({
    status: "Deleted", deleted_at: now, updated_at: now,
  }).eq("id", id);

  // Create endorsement
  const endKey = "endorsement_counter_FLT";
  const { data: cData } = await supabaseAdmin.from("system_config").select("value").eq("key", endKey).maybeSingle();
  const nextEnd = (typeof cData?.value === "number" ? cData.value : 0) + 1;
  await supabaseAdmin.from("system_config").upsert({ key: endKey, value: nextEnd, category: "counters" }, { onConflict: "key" });
  const endNumber = `END-FLT-${String(nextEnd).padStart(5, "0")}`;

  await db.from("fleet_vehicle_endorsements").insert({
    endorsement_number: endNumber,
    policy_id: vehicle.policy_id,
    customer_id: customerId,
    vehicle_id: id,
    endorsement_type: "Deletion",
    endorsement_date: now.split("T")[0],
    vehicle_details: {
      registration_number: vehicle.registration_number,
      make: vehicle.make,
      model: vehicle.model,
    },
    created_by: caller.uid,
    created_at: now,
  });

  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "delete", module: "fleet_vehicles",
      details: `Deleted fleet vehicle: ${vehicle.registration_number}`,
      user_id: caller.uid, user_name: caller.name ?? caller.email,
      user_role: caller.role, created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, endorsement_number: endNumber });
}
