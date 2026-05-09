/**
 * POST /api/service-desk/tickets/[id]/escalate — manual escalation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reason } = body as any;
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Escalation reason is required" }, { status: 400 });
  }

  const { data: ticket, error: fetchErr } = await supabaseAdmin
    .from("service_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status === "resolved" || ticket.status === "closed") {
    return NextResponse.json({ error: "Cannot escalate a resolved or closed ticket" }, { status: 422 });
  }

  // Employees can escalate to level 1; managers can escalate to level 2
  const currentLevel = ticket.escalation_level || 0;
  let newLevel = currentLevel + 1;

  if (caller.role === "employee" && newLevel > 1) newLevel = 1;
  if (newLevel > 2) {
    return NextResponse.json({ error: "Ticket is already at maximum escalation level" }, { status: 422 });
  }

  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("service_tickets")
    .update({
      escalation_level: newLevel,
      escalated_at: now,
      escalation_reason: String(reason).trim(),
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Activity log
  await supabaseAdmin.from("ticket_activity_log").insert({
    ticket_id: id,
    entry_type: "escalated",
    description: `Ticket escalated to Level ${newLevel}. Reason: ${reason}`,
    old_value: String(currentLevel),
    new_value: String(newLevel),
    performed_by: caller.uid,
    performed_by_name: caller.name ?? caller.email,
    created_at: now,
  } as any);

  // Notify managers (level 1) or admins (level 2)
  const notifyRole = newLevel === 1 ? "manager" : "admin";
  const { data: notifyUsers } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("role", notifyRole)
    .eq("status", "active");

  for (const u of notifyUsers ?? []) {
    await supabaseAdmin.from("notifications").insert({
      user_id: u.id,
      title: `Ticket Escalated to Level ${newLevel}`,
      message: `Ticket ${ticket.ticket_number} has been escalated. Reason: ${reason}`,
      type: "system",
      link: `/dashboard/service-desk/${id}`,
      read: false,
      created_at: now,
      updated_at: now,
    } as any);
  }

  return NextResponse.json(updated);
}
