/**
 * POST /api/compliance/[id]/complete
 * Mark compliance item as completed.
 * For recurring items, creates the next occurrence.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

function getNextDueDate(currentDueDate: string, recurrence: string): string | null {
  const date = new Date(currentDueDate);

  switch (recurrence) {
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "half_yearly":
      date.setMonth(date.getMonth() + 6);
      break;
    case "annual":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null; // one_time
  }

  return date.toISOString().split("T")[0];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { completion_notes, completion_document_url } = body;

  // Fetch the item
  const { data: item, error: fetchError } = await db
    .from("compliance_items")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Compliance item not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Mark as completed
  const { data: updated, error } = await db
    .from("compliance_items")
    .update({
      status: "completed",
      completed_at: now,
      completed_by: caller.uid,
      completion_notes: completion_notes ?? null,
      completion_document_url: completion_document_url ?? null,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create next occurrence for recurring items
  let nextItem = null;
  if (item.recurrence !== "one_time") {
    const nextDueDate = getNextDueDate(item.due_date, item.recurrence);
    if (nextDueDate) {
      const { data: next } = await db
        .from("compliance_items")
        .insert({
          title: item.title,
          category: item.category,
          description: item.description,
          due_date: nextDueDate,
          assigned_to: item.assigned_to,
          assigned_to_name: item.assigned_to_name,
          status: "pending",
          recurrence: item.recurrence,
          parent_item_id: id,
          created_by: caller.uid,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      nextItem = next;
    }
  }

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update",
      module: "compliance",
      details: `Completed compliance item: ${item.title}${nextItem ? ` — next occurrence created for ${nextItem.due_date}` : ""}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { compliance_id: id, next_item_id: nextItem?.id },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json({ completed: updated, next_occurrence: nextItem });
}
