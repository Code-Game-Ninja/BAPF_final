/**
 * POST /api/renewals/[id]/follow-up
 * Create a follow-up task for a renewal.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { task_type, due_date, notes, assigned_to, assigned_to_name } = body;

  if (!task_type || !due_date || !assigned_to) {
    return NextResponse.json(
      { error: "task_type, due_date, and assigned_to are required" },
      { status: 400 }
    );
  }

  const validTypes = ["call", "email", "meeting", "whatsapp"];
  if (!validTypes.includes(task_type)) {
    return NextResponse.json({ error: "Invalid task_type" }, { status: 400 });
  }

  // Verify renewal exists
  const { data: renewal, error: fetchError } = await db
    .from("renewal_pipeline")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !renewal) {
    return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const { data: task, error } = await db
    .from("follow_up_tasks")
    .insert({
      renewal_id: id,
      task_type,
      due_date,
      notes: notes ?? null,
      assigned_to,
      assigned_to_name: assigned_to_name ?? null,
      status: "pending",
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(task, { status: 201 });
}
