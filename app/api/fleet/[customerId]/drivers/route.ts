/**
 * GET  /api/fleet/[customerId]/drivers — list drivers
 * POST /api/fleet/[customerId]/drivers — add driver
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
    .from("fleet_drivers")
    .select("*, fleet_vehicles(id, registration_number, make, model)")
    .eq("customer_id", customerId)
    .order("name");

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

  const { name, license_number, license_expiry } = body as any;

  if (!name || !license_number || !license_expiry) {
    return NextResponse.json({ error: "name, license_number, and license_expiry are required" }, { status: 400 });
  }

  // License expiry must be a future date
  if (new Date(license_expiry) <= new Date()) {
    return NextResponse.json({ error: "license_expiry must be a future date" }, { status: 400 });
  }

  // License number uniqueness
  const { data: existing } = await supabaseAdmin
    .from("fleet_drivers")
    .select("id")
    .eq("license_number", license_number)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: `License number ${license_number} already exists` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: driver, error: insertErr } = await supabaseAdmin
    .from("fleet_drivers")
    .insert({
      customer_id: customerId,
      name,
      license_number,
      license_expiry,
      mobile: (body.mobile as string) || null,
      address: (body.address as string) || null,
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    } as any)
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Check if license expires within 30 days — send alert
  const daysToExpiry = Math.floor((new Date(license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysToExpiry <= 30) {
    await supabaseAdmin.from("notifications").insert({
      user_id: caller.uid,
      title: "Driver License Expiring Soon",
      message: `Driver ${name}'s license expires in ${daysToExpiry} days`,
      type: "system",
      read: false,
      created_at: now,
      updated_at: now,
    } as any);
  }

  return NextResponse.json(driver, { status: 201 });
}
