/**
 * GET  /api/leads       — List all sales leads
 * POST /api/leads       — Create a new sales lead
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import { leadSchema } from "@/lib/validations/lead";

// ── GET ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 60, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  try {
    let query = supabaseAdmin
      .from("sales_leads")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Employees only see their assigned leads
    if (caller.role === "employee") {
      query = query.eq("assigned_to", caller.uid);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[leads/GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    console.error("[leads/GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────

async function nextLeadUID(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("next_lead_uid");
  if (error) throw new Error(error.message);
  return data as string;
}

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const lead_number = await nextLeadUID();
    const now = new Date().toISOString();

    const payload = {
      lead_number,
      lead_date: new Date().toISOString().split("T")[0],
      customer_name: parsed.data.customer_name,
      mobile: parsed.data.mobile,
      alt_mobile: parsed.data.alt_mobile || null,
      email: parsed.data.email || null,
      source: parsed.data.source,
      assigned_to: parsed.data.assigned_to,
      assigned_to_name: (body.assigned_to_name as string) || null,
      priority: parsed.data.priority,
      status: parsed.data.status || "new",
      notes: parsed.data.notes || null,
      follow_up_date: parsed.data.follow_up_date || null,
      meeting_date: parsed.data.meeting_date || null,
      branch_id: (body.branch_id as string) || null,
      poc_name: parsed.data.poc_name || null,
      location: parsed.data.location || null,
      client_type: parsed.data.client_type || null,
      estimated_value: parsed.data.estimated_value ?? null,
      created_by: caller.uid,
      created_by_name: caller.name ?? caller.email,
      created_at: now,
      updated_at: now,
    };

    const { data: created, error } = await supabaseAdmin
      .from("sales_leads")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[leads/POST] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add initial timeline entry
    await supabaseAdmin.from("lead_timeline").insert({
      lead_id: created.id,
      action: "created",
      description: `Lead ${lead_number} created for ${parsed.data.customer_name}`,
      performed_by: caller.uid,
      performed_by_name: caller.name ?? caller.email,
      created_at: now,
      updated_at: now,
    });

     // Audit log (best-effort)
    try {
      await supabaseAdmin.from("audit_logs").insert({
        action: "create",
        module: "sales-leads",
        details: `Created lead: ${lead_number} — ${parsed.data.customer_name}`,
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        created_at: now,
      });
    } catch (auditErr) {
      console.error("[leads/POST] Audit log failed:", auditErr);
    }

    // Notify the assigned employee (skip self-assignment)
    if (parsed.data.assigned_to !== caller.uid) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: parsed.data.assigned_to,
          title: "New Lead Assigned",
          message: `Lead ${lead_number} — ${parsed.data.customer_name} has been assigned to you by ${caller.name ?? caller.email}`,
          type: "lead_assignment",
          link: `/dashboard/sales-leads/${created.id}`,
          read: false,
          created_at: now,
          updated_at: now,
        });
      } catch (notifErr) {
        console.error("[leads/POST] Notification failed:", notifErr);
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    console.error("[leads/POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
