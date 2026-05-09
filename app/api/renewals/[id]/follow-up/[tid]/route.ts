/**
 * PUT /api/renewals/[id]/follow-up/[tid]
 * Update or complete a follow-up task.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id, tid } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status, completion_notes, due_date, notes } = body;

  const now = new Date().toISOString();
  const updatePayload: any = { updated_at: now };

  if (status) {
    const validStatuses = ["pending", "completed", "snoozed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updatePayload.status = status;

    if (status === "completed") {
      updatePayload.completed_at = now;
      updatePayload.completion_notes = completion_notes ?? null;

      // Update last_contact_date on the renewal
      await db
        .from("renewal_pipeline")
        .update({ last_contact_date: now, updated_at: now })
        .eq("id", id);
    }
  }

  if (due_date) updatePayload.due_date = due_date;
  if (notes !== undefined) updatePayload.notes = notes;

  const { data: task, error } = await db
    .from("follow_up_tasks")
    .update(updatePayload)
    .eq("id", tid)
    .eq("renewal_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}
