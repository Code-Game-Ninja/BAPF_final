/**
 * GET    /api/leads/[id]   — Get a single lead
 * PUT    /api/leads/[id]   — Update a lead
 * DELETE /api/leads/[id]   — Soft-delete a lead (admin only)
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import { leadUpdateSchema } from "@/lib/validations/lead";

// ── GET ──────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 60, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("sales_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[leads/GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Employees can only view their assigned leads
    if (caller.role === "employee" && data.assigned_to !== caller.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[leads/GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PUT ──────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate body against update schema
  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    // Verify lead exists and check access
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("sales_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (caller.role === "employee" && existing.assigned_to !== caller.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("sales_leads")
      .update({ ...parsed.data, updated_at: now })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("[leads/PUT] Update error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log (best-effort)
    try {
      await supabaseAdmin.from("audit_logs").insert({
        action: "update",
        module: "sales-leads",
        details: `Updated lead: ${existing.lead_number}`,
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        created_at: now,
      });
    } catch (auditErr) {
      console.error("[leads/PUT] Audit log failed:", auditErr);
    }

    // Notify new assignee if lead was reassigned
    const newAssignee = parsed.data.assigned_to as string | undefined;
    if (newAssignee && newAssignee !== existing.assigned_to && newAssignee !== caller.uid) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: newAssignee,
          title: "Lead Reassigned to You",
          message: `Lead ${existing.lead_number} — ${updated.customer_name ?? existing.customer_name} has been reassigned to you by ${caller.name ?? caller.email}`,
          type: "lead_assignment",
          link: `/dashboard/sales-leads/${id}`,
          read: false,
          created_at: now,
          updated_at: now,
        });
      } catch (notifErr) {
        console.error("[leads/PUT] Notification failed:", notifErr);
      }
    }

    // Notify assigned person when status changes (if they didn't make the change)
    const newStatus = parsed.data.status as string | undefined;
    const assignedTo = (newAssignee ?? existing.assigned_to) as string;
    if (newStatus && newStatus !== existing.status && assignedTo && assignedTo !== caller.uid) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: assignedTo,
          title: "Lead Status Updated",
          message: `Lead ${existing.lead_number} — ${existing.customer_name} status changed to "${newStatus.replace("_", " ")}" by ${caller.name ?? caller.email}`,
          type: "lead_status",
          link: `/dashboard/sales-leads/${id}`,
          read: false,
          created_at: now,
          updated_at: now,
        });
      } catch (notifErr) {
        console.error("[leads/PUT] Status notification failed:", notifErr);
      }
    }

    // Notify assigned person when follow-up date is set/changed
    const newFollowUpDate = parsed.data.follow_up_date as string | undefined;
    if (newFollowUpDate && newFollowUpDate !== existing.follow_up_date && assignedTo) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: assignedTo,
          title: "Follow-Up Scheduled",
          message: `Follow-up for lead ${existing.lead_number} — ${existing.customer_name} set to ${newFollowUpDate} by ${caller.name ?? caller.email}`,
          type: "lead_follow_up",
          link: `/dashboard/sales-leads/${id}`,
          read: false,
          created_at: now,
          updated_at: now,
        });
      } catch (notifErr) {
        console.error("[leads/PUT] Follow-up notification failed:", notifErr);
      }
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[leads/PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("sales_leads")
      .update({
        deleted_at: now,
        deleted_by: caller.uid,
        updated_at: now,
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("[leads/DELETE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Audit log (best-effort)
    try {
      await supabaseAdmin.from("audit_logs").insert({
        action: "delete",
        module: "sales-leads",
        details: `Deleted lead: ${rows[0].lead_number}`,
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        created_at: now,
      });
    } catch (auditErr) {
      console.error("[leads/DELETE] Audit log failed:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[leads/DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
