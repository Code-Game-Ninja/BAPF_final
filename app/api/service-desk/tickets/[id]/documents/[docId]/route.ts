/**
 * DELETE /api/service-desk/tickets/[id]/documents/[docId] — Delete document (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { id, docId } = await params;

  // Fetch document
  const { data: doc } = await supabaseAdmin
    .from("ticket_documents")
    .select("*")
    .eq("id", docId)
    .eq("ticket_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Soft delete
  const { error } = await supabaseAdmin
    .from("ticket_documents")
    .update({ deleted_at: now })
    .eq("id", docId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Activity log
  await supabaseAdmin.from("ticket_activity_log").insert({
    ticket_id: id,
    entry_type: "document_deleted",
    description: `Document "${doc.file_name}" deleted by ${caller.name ?? caller.email}`,
    performed_by: caller.uid,
    performed_by_name: caller.name ?? caller.email,
    created_at: now,
  });

  return NextResponse.json({ success: true });
}
