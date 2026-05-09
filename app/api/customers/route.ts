/**
 * GET  /api/customers  — paginated list with search, filters, metrics
 * POST /api/customers  — create with duplicate detection
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import { createCustomerSchema } from "@/lib/validation";

// ── GET ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "active";
  const assignedRm = searchParams.get("assigned_rm") ?? "";
  const city = searchParams.get("city") ?? "";
  const state = searchParams.get("state") ?? "";
  const sort = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") === "asc" ? true : false;

  let query = supabaseAdmin.from("customers").select("*", { count: "exact" });

  // Role-based filtering: employees only see their assigned customers
  if (caller.role === "employee") {
    query = query.or(`assigned_rm.eq.${caller.uid},created_by.eq.${caller.uid}`);
  }

  // Status filter
  if (status === "active") {
    query = query.or("status.is.null,status.eq.active");
  } else if (status === "inactive") {
    query = query.eq("status", "inactive");
  }

  // Type filter
  if (type) query = query.eq("customer_type", type);

  // RM filter
  if (assignedRm) query = query.eq("assigned_rm", assignedRm);

  // City / State filter
  if (city) query = query.ilike("city", `%${city}%`);
  if (state) query = query.ilike("state", `%${state}%`);

  // Search
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,uid.ilike.%${search}%`
    );
  }

  // Sort + paginate
  query = query
    .order(sort, { ascending: order })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Metrics (only for admin/manager — employees get filtered counts)
  const metrics = { total: count ?? 0, active: 0, byType: {} as Record<string, number> };
  if (caller.role !== "employee") {
    const { data: allForMetrics } = await supabaseAdmin
      .from("customers")
      .select("customer_type, status")
      .or("status.is.null,status.eq.active");

    if (allForMetrics) {
      metrics.active = allForMetrics.length;
      for (const c of allForMetrics) {
        const t = c.customer_type || "individual";
        metrics.byType[t] = (metrics.byType[t] || 0) + 1;
      }
    }
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    metrics,
  });
}

// ── POST ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createCustomerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.format() }, { status: 400 });
  }

  const validatedData = result.data;
  const { name, phone, email } = validatedData;
  const force_create = (body as any).force_create === true;

  // ── Duplicate detection ──────────────────────────────────────────
  if (!force_create) {
    const matches: { field: string; customer: unknown }[] = [];

    // Phone match
    if (phone) {
      const { data: byPhone } = await supabaseAdmin
        .from("customers")
        .select("id, uid, name, phone, email, customer_type, status")
        .eq("phone", phone)
        .neq("status", "inactive")
        .limit(3);
      (byPhone ?? []).forEach(c => matches.push({ field: "phone", customer: c }));
    }

    // Email match
    if (email && email !== "N/A" && email !== "") {
      const { data: byEmail } = await supabaseAdmin
        .from("customers")
        .select("id, uid, name, phone, email, customer_type, status")
        .ilike("email", email)
        .neq("status", "inactive")
        .limit(3);
      (byEmail ?? []).forEach(c => {
        if (!matches.find((m) => (m.customer as any).id === c.id)) {
          matches.push({ field: "email", customer: c });
        }
      });
    }

    // PAN match (from entity_meta)
    const panNumber = (validatedData.entity_meta as any)?.pan_number || validatedData.pan;
    if (panNumber) {
      const { data: byPan } = await supabaseAdmin
        .from("customers")
        .select("id, uid, name, phone, email, customer_type, status")
        .contains("entity_meta", { pan_number: panNumber })
        .neq("status", "inactive")
        .limit(3);
      (byPan ?? []).forEach(c => {
        if (!matches.find((m) => (m.customer as any).id === c.id)) {
          matches.push({ field: "pan", customer: c });
        }
      });
    }

    if (matches.length > 0) {
      return NextResponse.json(
        { duplicate: true, matches },
        { status: 409 }
      );
    }
  }

  // ── Create customer ──────────────────────────────────────────────
  // Get next UID via RPC
  const { data: uid, error: uidError } = await supabaseAdmin.rpc("next_customer_uid");
  if (uidError) return NextResponse.json({ error: "Failed to generate UID" }, { status: 500 });

  const now = new Date().toISOString();
  const payload = {
    uid,
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: email ? String(email).toLowerCase().trim() : "N/A",
    address: validatedData.address || null,
    city: validatedData.city || null,
    state: validatedData.state || null,
    pincode: validatedData.pincode || null,
    status: validatedData.status || "active",
    customer_type: validatedData.type || "individual",
    entity_meta: validatedData.entity_meta || {},
    created_by: caller.uid,
    created_at: now,
    updated_at: now,
    family_id: (body as any).family_id || null,
    assigned_rm: (body as any).assigned_rm || null,
    kyc_status: "pending",
  };

  const { data: created, error: insertError } = await supabaseAdmin
    .from("customers")
    .insert(payload)
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Audit log (best-effort)
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create",
      module: "customers",
      details: `Created customer: ${name} (${uid})`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { customer_id: created.id, uid, type: payload.customer_type },
      created_at: now,
    });
  } catch { /* non-critical */ }

  return NextResponse.json(created, { status: 201 });
}
