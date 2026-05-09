/**
 * PUT    /api/fleet/[customerId]/drivers/[id] — update driver
 * DELETE /api/fleet/[customerId]/drivers/[id] — delete driver
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

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

  const { name, license_expiry, mobile, address } = body as any;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  // Validate future date if provided
  if (license_expiry && new Date(license_expiry) <= new Date()) {
    return NextResponse.json({ error: "license_expiry must be a future date" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { name, updated_at: now };
  if (license_expiry) updates.license_expiry = license_expiry;
  if (mobile !== undefined) updates.mobile = mobile;
  if (address !== undefined) updates.address = address;

  const { data, error } = await db
    .from("fleet_drivers")
    .update(updates)
    .eq("id", id)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId, id } = await params;

  const { error } = await db
    .from("fleet_drivers")
    .delete()
    .eq("id", id)
    .eq("customer_id", customerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
