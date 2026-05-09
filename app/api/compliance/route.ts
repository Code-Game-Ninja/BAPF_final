/**
 * GET  /api/compliance  — List compliance items with filters
 * POST /api/compliance  — Create compliance item
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
  const category = searchParams.get("category") ?? "";
  const due_from = searchParams.get("due_from") ?? "";
  const due_to = searchParams.get("due_to") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

  let query = db
    .from("compliance_items")
    .select("*", { count: "exact" })
    .order("due_date", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (due_from) query = query.gte("due_date", due_from);
  if (due_to) query = query.lte("due_date", due_to);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    title,
    category,
    description,
    due_date,
    assigned_to,
    assigned_to_name,
    recurrence,
    parent_item_id,
  } = body;

  if (!title || !category || !due_date) {
    return NextResponse.json(
      { error: "title, category, and due_date are required" },
      { status: 400 }
    );
  }

  const validCategories = [
    "license_renewal", "regulatory_filing", "audit_submission",
    "training_certification", "policy_review", "other",
  ];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: created, error } = await db
    .from("compliance_items")
    .insert({
      title,
      category,
      description: description ?? null,
      due_date,
      assigned_to: assigned_to ?? null,
      assigned_to_name: assigned_to_name ?? null,
      status: "pending",
      recurrence: recurrence ?? "one_time",
      parent_item_id: parent_item_id ?? null,
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
      module: "compliance",
      details: `Created compliance item: ${title} (due: ${due_date})`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { compliance_id: created.id, title, category, due_date },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(created, { status: 201 });
}
