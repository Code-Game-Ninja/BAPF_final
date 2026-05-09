/**
 * POST /api/service-desk/tickets/bulk — Bulk operations (assign, status, export)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import { VALID_TRANSITIONS } from "@/lib/tickets/transitions";

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const operation = body.operation as string;
  const ticketIds = body.ticket_ids as string[];

  if (!operation || !ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return NextResponse.json({ error: "Missing required fields: operation, ticket_ids" }, { status: 400 });
  }

  if (ticketIds.length > 100) {
    return NextResponse.json({ error: "Cannot bulk operate on more than 100 tickets at once" }, { status: 400 });
  }

  const now = new Date().toISOString();

  switch (operation) {
    case "assign": {
      const ownerId = body.owner_id as string;
      if (!ownerId) {
        return NextResponse.json({ error: "Missing required field: owner_id" }, { status: 400 });
      }

      // Fetch new owner
      const { data: owner } = await supabaseAdmin
        .from("users")
        .select("id, name")
        .eq("id", ownerId)
        .maybeSingle();

      if (!owner) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      const { error } = await supabaseAdmin
        .from("service_tickets")
        .update({ owner_id: ownerId, updated_at: now })
        .in("id", ticketIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Activity logs
      const logs = ticketIds.map(tid => ({
        ticket_id: tid,
        entry_type: "assigned",
        description: `Bulk assigned to ${owner.name} by ${caller.name ?? caller.email}`,
        new_value: ownerId,
        performed_by: caller.uid,
        performed_by_name: caller.name ?? caller.email,
        created_at: now,
      }));
      await supabaseAdmin.from("ticket_activity_log").insert(logs);

      // Notify agent
      if (owner.id !== caller.uid) {
        await supabaseAdmin.from("notifications").insert({
          user_id: owner.id,
          title: "Tickets Bulk Assigned",
          message: `${ticketIds.length} tickets have been assigned to you by ${caller.name ?? caller.email}`,
          type: "assignment",
          link: "/dashboard/service-desk",
          read: false,
          created_at: now,
          updated_at: now,
        });
      }

      return NextResponse.json({ success: true, affected: ticketIds.length });
    }

    case "status": {
      const newStatus = body.status as string;
      if (!newStatus) {
        return NextResponse.json({ error: "Missing required field: status" }, { status: 400 });
      }

      // Fetch current tickets to validate transitions
      const { data: tickets } = await supabaseAdmin
        .from("service_tickets")
        .select("id, status, ticket_number")
        .in("id", ticketIds);

      const invalid: string[] = [];
      const valid: string[] = [];

      for (const ticket of tickets ?? []) {
        const allowed = VALID_TRANSITIONS[ticket.status as string] ?? [];
        if (allowed.includes(newStatus)) {
          valid.push(ticket.id);
        } else {
          invalid.push(ticket.ticket_number ?? ticket.id);
        }
      }

      if (valid.length > 0) {
        const updates: Record<string, unknown> = { status: newStatus, updated_at: now };
        if (newStatus === "resolved") {
          updates.resolved_at = now;
        }
        if (newStatus === "closed") {
          updates.closed_at = now;
        }

        await supabaseAdmin
          .from("service_tickets")
          .update(updates)
          .in("id", valid);

        const logs = valid.map(tid => ({
          ticket_id: tid,
          entry_type: "status_changed",
          description: `Bulk status update to ${newStatus} by ${caller.name ?? caller.email}`,
          new_value: newStatus,
          performed_by: caller.uid,
          performed_by_name: caller.name ?? caller.email,
          created_at: now,
        }));
        await supabaseAdmin.from("ticket_activity_log").insert(logs);
      }

      return NextResponse.json({
        success: true,
        affected: valid.length,
        skipped: invalid.length,
        skipped_tickets: invalid,
      });
    }

    case "export": {
      const { data: tickets } = await supabaseAdmin
        .from("service_tickets")
        .select(`
          ticket_number, category, priority, status, description,
          sla_deadline, created_at, resolved_at,
          customers:customer_id(name, phone),
          owner:owner_id(name)
        `)
        .in("id", ticketIds);

      return NextResponse.json({ data: tickets ?? [] });
    }

    default:
      return NextResponse.json({ error: `Unknown operation: ${operation}` }, { status: 400 });
  }
}
