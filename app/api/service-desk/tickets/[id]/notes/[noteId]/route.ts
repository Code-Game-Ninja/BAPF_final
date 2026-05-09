/**
 * PUT    /api/service-desk/tickets/[id]/notes/[noteId] — Update note (author/admin only)
 * DELETE /api/service-desk/tickets/[id]/notes/[noteId] — Delete note (author/admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id, noteId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.content) {
    return NextResponse.json({ error: "Missing required field: content" }, { status: 400 });
  }

  // Fetch note
  const { data: note } = await supabaseAdmin
    .from("ticket_notes")
    .select("*")
    .eq("id", noteId)
    .eq("ticket_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  // Only author or admin can edit
  if (note.author_id !== caller.uid && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — only the author or admin can edit this note" }, { status: 403 });
  }

  const now = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from("ticket_notes")
    .update({ content: body.content as string, updated_at: now })
    .eq("id", noteId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id, noteId } = await params;

  // Fetch note
  const { data: note } = await supabaseAdmin
    .from("ticket_notes")
    .select("*")
    .eq("id", noteId)
    .eq("ticket_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  // Only author or admin can delete
  if (note.author_id !== caller.uid && caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — only the author or admin can delete this note" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Soft delete
  const { error } = await supabaseAdmin
    .from("ticket_notes")
    .update({ deleted_at: now })
    .eq("id", noteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
