/**
 * GET  /api/service-desk/tickets  — list with queue/filters/pagination
 * POST /api/service-desk/tickets  — create with SLA calc + auto-assignment
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import {
  calculateSLADeadline,
  DEFAULT_BUSINESS_HOURS,
  getSLAHours,
  BusinessHoursConfig,
} from "@/lib/sla/businessHours";
import { autoAssignTicket } from "@/lib/tickets/autoAssignment";

// ── GET ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { searchParams } = new URL(req.url);
  const queue = searchParams.get("queue") ?? "all"; // my|team|unassigned|all
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assignedTo = searchParams.get("assigned_to") ?? "";
  const customerId = searchParams.get("customer_id") ?? "";
  const policyId = searchParams.get("policy_id") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25"));
  const sort = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") === "asc";
  const breachedOnly = searchParams.get("breached_only") === "true";
  const escalatedOnly = searchParams.get("escalated_only") === "true";
  const includeArchived = searchParams.get("include_archived") === "true";

  let query = supabaseAdmin
    .from("service_tickets")
    .select("*, customers(id, name, uid, phone)", { count: "exact" });

  // Queue filter
  if (queue === "my") {
    query = query.eq("owner_id", caller.uid);
  } else if (queue === "unassigned") {
    query = query.is("owner_id", null);
  }
  // "team" and "all" — no additional filter (role-based access applies)

  // Status filter
  if (status) query = query.eq("status", status);

  // Exclude archived by default
  if (!includeArchived) query = query.is("archived_at", null);

  // Other filters
  if (category) query = query.eq("category", category);
  if (priority) query = query.eq("priority", priority);
  if (assignedTo) query = query.eq("owner_id", assignedTo);
  if (customerId) query = query.eq("customer_id", customerId);
  if (policyId) query = query.eq("policy_id", policyId);
  if (breachedOnly) query = query.eq("is_breached", true);
  if (escalatedOnly) query = query.gt("escalation_level", 0);

  // Search
  if (search) {
    query = query.or(
      `ticket_number.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  // Sort + paginate
  query = query
    .order(sort, { ascending: order })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}

// ── POST ──────────────────────────────────────────────────────────

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

  interface CreateTicketBody {
    customer_id: string;
    category: string;
    description: string;
    priority?: string;
    policy_id?: string;
    owner_id?: string;
    internal_notes?: string;
    metadata?: Record<string, unknown>;
  }

  const { customer_id, category, description, priority = "medium", policy_id, owner_id } = (body as unknown) as CreateTicketBody;

  if (!customer_id || !category || !description) {
    return NextResponse.json(
      { error: "customer_id, category, and description are required" },
      { status: 400 }
    );
  }

  // ── Generate ticket number ────────────────────────────────────
  const { data: counterData } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", "ticket_counter")
    .maybeSingle();

  const currentCount = typeof counterData?.value === "number" ? counterData.value : 0;
  const nextCount = currentCount + 1;

  await supabaseAdmin
    .from("system_config")
    .upsert({ key: "ticket_counter", value: nextCount, category: "counters" }, { onConflict: "key" });

  const ticketNumber = `TKT-${String(nextCount).padStart(5, "0")}`;

  // ── Calculate SLA deadline ────────────────────────────────────
  const slaHours = getSLAHours(category, priority);

  // Fetch business hours config
  const { data: bhConfig } = await supabaseAdmin
    .from("business_hours_config")
    .select("*")
    .order("day_of_week");

  const businessHours = bhConfig && bhConfig.length > 0 ? bhConfig : DEFAULT_BUSINESS_HOURS;

  // Fetch holidays for current year
  const year = new Date().getFullYear();
  const { data: holidayData } = await supabaseAdmin
    .from("holidays")
    .select("date")
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);

  const holidays = (holidayData ?? []).map((h: { date: string }) => h.date);

  const now = new Date();
  const slaDeadline = calculateSLADeadline(now, slaHours, (businessHours as BusinessHoursConfig[]), holidays);

  // ── Auto-assign if no owner specified ────────────────────────
  let assignedOwner = owner_id || null;
  if (!assignedOwner) {
    assignedOwner = await autoAssignTicket(category);
  }

  // ── Insert ticket ─────────────────────────────────────────────
  const nowStr = now.toISOString();
  const { data: ticket, error: insertError } = await supabaseAdmin
    .from("service_tickets")
    .insert({
      ticket_number: ticketNumber,
      customer_id,
      policy_id: policy_id || null,
      category,
      priority,
      status: "open",
      owner_id: assignedOwner,
      description,
      sla_deadline: slaDeadline.toISOString(),
      internal_notes: (body.internal_notes as string) || null,
      metadata: (body.metadata as object) || {},
      escalation_level: 0,
      is_breached: false,
      sla_total_pause_minutes: 0,
      created_by: caller.uid,
      created_at: nowStr,
      updated_at: nowStr,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // ── Activity log ──────────────────────────────────────────────
  await supabaseAdmin.from("ticket_activity_log").insert({
    ticket_id: ticket.id,
    entry_type: "created",
    description: `Ticket ${ticketNumber} created`,
    performed_by: caller.uid,
    performed_by_name: caller.name ?? caller.email,
    created_at: nowStr,
  });

  // ── Notify assigned agent ─────────────────────────────────────
  if (assignedOwner && assignedOwner !== caller.uid) {
    await supabaseAdmin.from("notifications").insert({
      user_id: assignedOwner,
      title: "New Ticket Assigned",
      message: `Ticket ${ticketNumber} has been assigned to you`,
      type: "assignment",
      link: `/dashboard/service-desk/${ticket.id}`,
      read: false,
      created_at: nowStr,
      updated_at: nowStr,
    });
  }

  return NextResponse.json({ ...ticket, sla_hours: slaHours }, { status: 201 });
}

