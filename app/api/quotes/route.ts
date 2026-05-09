/**
 * GET  /api/quotes  — List quote requests
 * POST /api/quotes  — Create quote request (generates QR-XXXXX number)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const customer_id = searchParams.get("customer_id") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));

  let query = db
    .from("quote_requests")
    .select(
      `
      *,
      customers!quote_requests_customer_id_fkey(id, uid, name, phone),
      quotes(id, insurer_name, premium_amount, sum_insured, is_accepted, is_expired, validity_date)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq("status", status);
  if (customer_id) query = query.eq("customer_id", customer_id);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { customer_id, policy_type, coverage_requirements, target_insurers, notes, assigned_to, linked_renewal_id, linked_lead_id } = body;

  if (!customer_id || !policy_type || !assigned_to) {
    return NextResponse.json(
      { error: "customer_id, policy_type, and assigned_to are required" },
      { status: 400 }
    );
  }

  // Generate QR-XXXXX number
  const { count: existingCount } = await db
    .from("quote_requests")
    .select("id", { count: "exact", head: true });

  const nextNum = (existingCount ?? 0) + 1;
  const quote_request_number = `QR-${String(nextNum).padStart(5, "0")}`;

  const now = new Date().toISOString();

  const { data: created, error } = await db
    .from("quote_requests")
    .insert({
      quote_request_number,
      customer_id,
      policy_type,
      coverage_requirements: coverage_requirements ?? null,
      target_insurers: target_insurers ?? [],
      status: "open",
      linked_renewal_id: linked_renewal_id ?? null,
      linked_lead_id: linked_lead_id ?? null,
      assigned_to,
      notes: notes ?? null,
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create",
      module: "quotes",
      details: `Created quote request ${quote_request_number} for customer ${customer_id}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { quote_request_id: created.id, quote_request_number },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(created, { status: 201 });
}
