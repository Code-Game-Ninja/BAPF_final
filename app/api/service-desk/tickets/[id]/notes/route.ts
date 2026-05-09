/**
 * POST /api/service-desk/tickets/[id]/notes — add note (internal/customer)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("ticket_notes")
    .select("*")
    .eq("ticket_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter internal notes for non-staff
  const notes = (data ?? []).filter((n: any) => {
    if (n.visibility === "internal") {
      return ["admin", "manager", "employee"].includes(caller.role);
    }
    return true;
  });

  return NextResponse.json({ data: notes });
}

export async function POST(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: ticketId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, visibility = "internal" } = body as any;

  if (!content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  // Only staff can add internal notes
  if (visibility === "internal" && !["admin", "manager", "employee"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden — internal notes require staff role" }, { status: 403 });
  }

  const now = new Date().toISOString();

  const { data: note, error: insertErr } = await supabaseAdmin
    .from("ticket_notes")
    .insert({
      ticket_id: ticketId,
      content: String(content).trim(),
      visibility,
      author_id: caller.uid,
      author_name: caller.name ?? caller.email,
      created_at: now,
      updated_at: now,
    } as any)
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Activity log
  await supabaseAdmin.from("ticket_activity_log").insert({
    ticket_id: ticketId,
    entry_type: "note_added",
    description: `${visibility === "internal" ? "Internal" : "Customer"} note added`,
    performed_by: caller.uid,
    performed_by_name: caller.name ?? caller.email,
    created_at: now,
  } as any);

  // Notify customer if customer note
  if (visibility === "customer") {
    const { data: ticket } = await supabaseAdmin
      .from("service_tickets")
      .select("customer_id, ticket_number")
      .eq("id", ticketId)
      .single();

    if (ticket?.customer_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: ticket.customer_id,
        title: "New Update on Your Ticket",
        message: `A new update has been added to ticket ${ticket.ticket_number}`,
        type: "system",
        link: `/dashboard/service-desk/${ticketId}`,
        read: false,
        created_at: now,
        updated_at: now,
      } as any);
    }
  }

  return NextResponse.json(note, { status: 201 });
}
