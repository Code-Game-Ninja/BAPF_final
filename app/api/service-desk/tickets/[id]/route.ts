/**
 * GET /api/service-desk/tickets/[id]  — full ticket detail
 * PUT /api/service-desk/tickets/[id]  — update with state machine
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { calculatePausedSLADeadline } from "@/lib/sla/businessHours";
import { VALID_TRANSITIONS } from "@/lib/tickets/transitions";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;

  const [ticketRes, notesRes, activityRes, docsRes] = await Promise.all([
    supabaseAdmin
      .from("service_tickets")
      .select("*, customers(id, name, uid, phone, email), policies(id, policy_number, policy_type, insurer_name)")
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("ticket_notes")
      .select("*")
      .eq("ticket_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("ticket_activity_log")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("ticket_documents")
      .select("*")
      .eq("ticket_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (ticketRes.error || !ticketRes.data) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Filter internal notes for non-staff (future: customer portal)
  const notes = (notesRes.data ?? []).filter((n: any) => {
    if (n.visibility === "internal") {
      return ["admin", "manager", "employee"].includes(caller.role);
    }
    return true;
  });

  return NextResponse.json({
    ticket: ticketRes.data,
    notes,
    activity: activityRes.data ?? [],
    documents: docsRes.data ?? [],
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Fetch current ticket
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from("service_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const now = new Date();
  const nowStr = now.toISOString();
  const updates: Record<string, unknown> = { updated_at: nowStr };
  const activityEntries: any[] = [];

  // ── Status transition ─────────────────────────────────────────
  if (body.status && body.status !== current.status) {
    const newStatus = body.status as string;
    const allowed = VALID_TRANSITIONS[current.status] ?? [];

    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${current.status} → ${newStatus}`,
          allowed_transitions: allowed,
        },
        { status: 422 }
      );
    }

    updates.status = newStatus;

    // SLA pause on pending
    if (newStatus === "pending" && !current.sla_paused_at) {
      updates.sla_paused_at = nowStr;
    }

    // SLA resume on in_progress (was pending)
    if (newStatus === "in_progress" && current.sla_paused_at) {
      const pauseMinutes = Math.floor(
        (now.getTime() - new Date(current.sla_paused_at).getTime()) / 60_000
      );
      const totalPause = (current.sla_total_pause_minutes || 0) + pauseMinutes;
      updates.sla_total_pause_minutes = totalPause;
      updates.sla_paused_at = null;

      // Adjust SLA deadline
      if (current.sla_deadline) {
        const newDeadline = calculatePausedSLADeadline(
          new Date(current.sla_deadline),
          pauseMinutes
        );
        updates.sla_deadline = newDeadline.toISOString();
      }
    }

    // Resolution
    if (newStatus === "resolved") {
      updates.resolved_at = nowStr;
      const resolutionMinutes = Math.floor(
        (now.getTime() - new Date(current.created_at).getTime()) / 60_000
      );
      updates.resolution_time_minutes = resolutionMinutes;
      updates.resolved_on_time = current.sla_deadline
        ? now <= new Date(current.sla_deadline)
        : true;
    }

    if (newStatus === "closed") {
      updates.closed_at = nowStr;
    }

    activityEntries.push({
      ticket_id: id,
      entry_type: "status_changed",
      description: `Status changed from ${current.status} to ${newStatus}`,
      old_value: current.status,
      new_value: newStatus,
      performed_by: caller.uid,
      performed_by_name: caller.name ?? caller.email,
      created_at: nowStr,
    });
  }

  // ── Priority update ───────────────────────────────────────────
  if (body.priority && body.priority !== current.priority) {
    updates.priority = body.priority;
  }

  // ── Description update ────────────────────────────────────────
  if (body.description !== undefined) {
    updates.description = body.description;
  }

  // ── Apply updates ─────────────────────────────────────────────
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("service_tickets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // ── Activity log ──────────────────────────────────────────────
  if (activityEntries.length > 0) {
    await supabaseAdmin.from("ticket_activity_log").insert(activityEntries as any);
  }

  // ── Notify owner on status change ─────────────────────────────
  if (body.status && current.owner_id && current.owner_id !== caller.uid) {
    await supabaseAdmin.from("notifications").insert({
      user_id: current.owner_id,
      title: "Ticket Status Updated",
      message: `Ticket ${current.ticket_number} status changed to ${body.status}`,
      type: "system",
      link: `/dashboard/service-desk/${id}`,
      read: false,
      created_at: nowStr,
      updated_at: nowStr,
    } as any);
  }
}
