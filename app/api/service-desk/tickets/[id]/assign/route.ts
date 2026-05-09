/**
 * POST /api/service-desk/tickets/[id]/assign — assign or reassign ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { owner_id } = body as any;
  if (!owner_id) {
    return NextResponse.json({ error: "owner_id is required" }, { status: 400 });
  }

  const { data: ticket, error: fetchErr } = await supabaseAdmin
    .from("service_tickets")
    .select("id, ticket_number, owner_id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const isReassign = !!ticket.owner_id;

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("service_tickets")
    .update({ owner_id, updated_at: now })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Activity log
  await supabaseAdmin.from("ticket_activity_log").insert({
    ticket_id: id,
    entry_type: isReassign ? "reassigned" : "assigned",
    description: `Ticket ${isReassign ? "reassigned" : "assigned"} to new agent`,
    old_value: ticket.owner_id || null,
    new_value: owner_id,
    performed_by: caller.uid,
    performed_by_name: caller.name ?? caller.email,
    created_at: now,
  } as any);

  // Notify new owner
  if (owner_id !== caller.uid) {
    await supabaseAdmin.from("notifications").insert({
      user_id: owner_id,
      title: "Ticket Assigned to You",
      message: `Ticket ${ticket.ticket_number} has been assigned to you`,
      type: "assignment",
      link: `/dashboard/service-desk/${id}`,
      read: false,
      created_at: now,
      updated_at: now,
    } as any);
  }

  return NextResponse.json(updated);
}
