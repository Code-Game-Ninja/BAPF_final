/**
 * POST /api/customers/auto-create
 * ─────────────────────────────────────────────────────────────────────────────
 * Create-or-find a customer from OCR-extracted PDF data.
 *
 * Body:
 * {
 *   name:     string          (required)
 *   email?:   string
 *   phone?:   string
 *   address?: string
 *   city?:    string
 *   state?:   string
 *   pincode?: string
 * }
 *
 * Behaviour:
 *   1. Look up by phone (preferred) then by email.
 *   2. If found → return existing customer with `{ found: true }`.
 *   3. If not found → create, return with `{ found: false }`.
 *
 * Auth: admin, manager, employee
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

// ── POST ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  let body: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Missing required field: name" }, { status: 422 });
  }

  // 1. Search by phone
  if (body.phone) {
    const { data: byPhone } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("phone", body.phone.trim())
      .limit(1)
      .maybeSingle();

    if (byPhone) {
      return NextResponse.json({ ...byPhone, found: true });
    }
  }

  // 2. Search by email
  if (body.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("email", body.email.trim().toLowerCase())
      .limit(1)
      .maybeSingle();

    if (byEmail) {
      return NextResponse.json({ ...byEmail, found: true });
    }
  }

  // 3. Create new customer
  const now = new Date().toISOString();

  // Generate uid via RPC
  const { data: uid, error: uidError } = await supabaseAdmin.rpc("next_customer_uid");
  if (uidError || !uid) {
    console.error("[customers/auto-create] UID generation failed:", uidError);
    return NextResponse.json({ error: "Failed to generate customer ID" }, { status: 500 });
  }

  // Ensure required fields are never null/undefined
  const email = body.email?.trim();
  const phone = body.phone?.trim();

  const payload = {
    uid,
    name:          body.name.trim(),
    email:         (email && email.toLowerCase()) || "N/A",
    phone:         phone || "N/A",
    address:       body.address?.trim() ?? null,
    city:          body.city?.trim() ?? null,
    state:         body.state?.trim() ?? null,
    pincode:       body.pincode?.trim() ?? null,
    status:        "active",
    customer_type: "individual",
    created_by:    caller.uid,
    created_at:    now,
    updated_at:    now,
  };

  // Debug logging to catch null email issues
  if (!payload.email || payload.email === "null" || payload.email === "undefined") {
    console.error("[customers/auto-create] Email validation failed:", {
      bodyEmail: body.email,
      processedEmail: payload.email,
      body: JSON.stringify(body, (_, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ),
    });
    return NextResponse.json({ error: "Email is required" }, { status: 422 });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("customers")
    .insert(payload)
    .select()
    .single();

  if (insertError || !inserted) {
    console.error("[customers/auto-create] Insert error:", insertError);
    return NextResponse.json({ error: insertError?.message || "Failed to create customer" }, { status: 500 });
  }

  // Audit
  try {
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      action:      "customer.auto_create",
      module:      "customers",
      details: `Auto-created customer ${body.name} from OCR extract`,
      user_id:     caller.uid,
      user_name:   caller.email,
      user_role:   caller.role,
      metadata:    { customer_id: inserted.id, name: body.name, phone: body.phone ?? null, email: body.email ?? null },
      created_at:  now,
    });
    if (auditError) console.error("[customers/auto-create] Audit log failed:", auditError);
  } catch (auditErr) {
    console.error("[customers/auto-create] Audit log failed:", auditErr);
  }

  return NextResponse.json({ ...inserted, found: false }, { status: 201 });
}
