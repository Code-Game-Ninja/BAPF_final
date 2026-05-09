/**
 * PUT /api/commission-rates/[id]
 * Update commission rate (admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updatePayload: any = { updated_at: now };

  const allowedFields = [
    "insurer_name", "policy_type", "rate_type", "rate_value",
    "effective_from", "effective_to", "is_active",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updatePayload[field] = body[field];
    }
  }

  if (updatePayload.rate_type === "percentage" && updatePayload.rate_value !== undefined) {
    if (updatePayload.rate_value < 0 || updatePayload.rate_value > 100) {
      return NextResponse.json(
        { error: "Percentage rate must be between 0 and 100" },
        { status: 400 }
      );
    }
  }

  const { data: updated, error } = await db
    .from("commission_rates")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Rate not found" }, { status: 404 });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update",
      module: "commission_rates",
      details: `Updated commission rate ${id}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { rate_id: id, changes: updatePayload },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(updated);
}
