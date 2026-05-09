/**
 * GET    /api/leads/[id]/reminders           — List reminders for a lead
 * POST   /api/leads/[id]/reminders           — Create a reminder (+ email notification)
 * PATCH  /api/leads/[id]/reminders?rid=...   — Update reminder status (done/snoozed)
 * DELETE /api/leads/[id]/reminders?rid=...   — Delete a reminder
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import { emailService } from "@/lib/services/email.service";

// ── helpers ─────────────────────────────────────────────────────

async function verifyLeadAccess(leadId: string, caller: { uid: string; role: string }) {
  if (caller.role !== "employee") return null;
  const { data } = await supabaseAdmin
    .from("sales_leads")
    .select("assigned_to")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (data.assigned_to !== caller.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

const REMINDER_TABLE = "lead_reminders";

// ── GET ──────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 60, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: leadId } = await params;
  if (!leadId) return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });

  const accessDenied = await verifyLeadAccess(leadId, caller);
  if (accessDenied) return accessDenied;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.from(REMINDER_TABLE) as any)
      .select("*")
      .eq("lead_id", leadId)
      .order("reminder_date", { ascending: true });

    if (error) {
      console.error("[lead-reminders/GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    console.error("[lead-reminders/GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: leadId } = await params;
  if (!leadId) return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });

  const accessDenied = await verifyLeadAccess(leadId, caller);
  if (accessDenied) return accessDenied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reminder_type = body.reminder_type as string;
  const reminder_date = body.reminder_date as string;
  const note = (body.note as string) || null;

  const VALID_TYPES = ["call", "meeting", "document", "proposal", "other"];
  if (!reminder_type || !VALID_TYPES.includes(reminder_type)) {
    return NextResponse.json(
      { error: `reminder_type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!reminder_date || !/^\d{4}-\d{2}-\d{2}$/.test(reminder_date)) {
    return NextResponse.json(
      { error: "reminder_date is required (YYYY-MM-DD format)" },
      { status: 400 }
    );
  }

  try {
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.from(REMINDER_TABLE) as any)
      .insert({
        lead_id: leadId,
        reminder_type,
        reminder_date,
        note,
        status: "pending",
        created_by: caller.uid,
        created_by_name: caller.name ?? caller.email,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("[lead-reminders/POST] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch lead info + assigned user for email notifications
    try {
      const { data: lead } = await supabaseAdmin
        .from("sales_leads")
        .select("lead_number, customer_name, assigned_to, assigned_to_name")
        .eq("id", leadId)
        .maybeSingle();

      if (lead) {
        // Collect unique user IDs to notify: creator + assigned person
        const userIdsToNotify = new Set<string>();
        userIdsToNotify.add(caller.uid);
        if (lead.assigned_to) userIdsToNotify.add(lead.assigned_to);

        // Fetch email addresses
        const { data: users } = await supabaseAdmin
          .from("users")
          .select("id, name, email")
          .in("id", Array.from(userIdsToNotify));

        if (users && users.length > 0) {
          const typeLabel = reminder_type.charAt(0).toUpperCase() + reminder_type.slice(1);
          const emails = users.map((u: { email: string }) => u.email).filter(Boolean);

          if (emails.length > 0) {
            // Send email notification to both creator and assigned person
            await emailService.sendGeneric(emails, {
              recipientName: "Team",
              title: `Reminder Set: ${typeLabel} — Lead ${lead.lead_number}`,
              body: `A ${typeLabel.toLowerCase()} reminder has been set for lead ${lead.lead_number} (${lead.customer_name}) on ${reminder_date}.${note ? `\n\nNote: ${note}` : ""}\n\nSet by: ${caller.name ?? caller.email}`,
            });
          }

          // Also insert in-app notification for assigned person (if different from creator)
          if (lead.assigned_to && lead.assigned_to !== caller.uid) {
            await supabaseAdmin.from("notifications").insert({
              user_id: lead.assigned_to,
              title: `Reminder: ${typeLabel} on ${reminder_date}`,
              message: `${caller.name ?? caller.email} set a ${typeLabel.toLowerCase()} reminder for lead ${lead.lead_number} — ${lead.customer_name}`,
              type: "lead_follow_up",
              link: `/dashboard/sales-leads/${leadId}`,
              read: false,
              created_at: now,
              updated_at: now,
            });
          }
        }
      }
    } catch (emailErr) {
      console.error("[lead-reminders/POST] Email notification failed:", emailErr);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error("[lead-reminders/POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH ────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: leadId } = await params;
  if (!leadId) return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });

  const accessDenied = await verifyLeadAccess(leadId, caller);
  if (accessDenied) return accessDenied;

  const rid = req.nextUrl.searchParams.get("rid");
  if (!rid) return NextResponse.json({ error: "Missing reminder ID (rid)" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status as string;
  if (!status || !["done", "snoozed", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.from(REMINDER_TABLE) as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", rid)
      .eq("lead_id", leadId)
      .select()
      .single();

    if (error) {
      console.error("[lead-reminders/PATCH] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[lead-reminders/PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: leadId } = await params;
  if (!leadId) return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });

  const accessDenied = await verifyLeadAccess(leadId, caller);
  if (accessDenied) return accessDenied;

  const rid = req.nextUrl.searchParams.get("rid");
  if (!rid) return NextResponse.json({ error: "Missing reminder ID (rid)" }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin.from(REMINDER_TABLE) as any)
      .delete()
      .eq("id", rid)
      .eq("lead_id", leadId);

    if (error) {
      console.error("[lead-reminders/DELETE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[lead-reminders/DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
