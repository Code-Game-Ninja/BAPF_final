/**
 * PUT /api/fleet/[customerId]/vehicles/[id]/validity — update validity dates
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ customerId: string; id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: vehicleId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { document_type, issue_date, expiry_date } = body as any;

  if (!document_type || !expiry_date) {
    return NextResponse.json({ error: "document_type and expiry_date are required" }, { status: 400 });
  }

  // Validate expiry > issue
  if (issue_date && new Date(expiry_date) <= new Date(issue_date)) {
    return NextResponse.json({ error: "expiry_date must be after issue_date" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const expiryDate = new Date(expiry_date);
  const today = new Date();
  const daysLeft = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const status = daysLeft < 0 ? "expired" : daysLeft <= 30 ? "expiring_soon" : "valid";

  const { data, error } = await supabaseAdmin
    .from("fleet_validity_documents")
    .upsert({
      vehicle_id: vehicleId,
      document_type,
      issue_date: issue_date || null,
      expiry_date,
      status,
      updated_by: caller.uid,
      updated_at: now,
    } as any, { onConflict: "vehicle_id,document_type" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
