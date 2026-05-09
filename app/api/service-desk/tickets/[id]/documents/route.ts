/**
 * POST /api/service-desk/tickets/[id]/documents — Upload document attachment
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;

  // Verify ticket exists
  const { data: ticket } = await supabaseAdmin
    .from("service_tickets")
    .select("id, ticket_number")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File size exceeds 10 MB limit" }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Supported: PDF, JPG, PNG, DOCX, XLSX" },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split(".").pop() ?? "bin";
  const filePath = `service-desk/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from("documents")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[documents/POST] Upload failed:", uploadError);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from("documents")
    .getPublicUrl(filePath);

  const now = new Date().toISOString();

  // Save document record
  const { data: doc, error: dbError } = await supabaseAdmin
    .from("ticket_documents")
    .insert({
      ticket_id: id,
      file_name: file.name,
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_size: file.size,
      uploaded_by: caller.uid,
      uploaded_by_name: caller.name ?? caller.email,
      created_at: now,
    })
    .select("*")
    .single();

  if (dbError) {
    // Cleanup uploaded file
    await supabaseAdmin.storage.from("documents").remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Activity log
  await supabaseAdmin.from("ticket_activity_log").insert({
    ticket_id: id,
    entry_type: "document_uploaded",
    description: `Document "${file.name}" uploaded by ${caller.name ?? caller.email}`,
    performed_by: caller.uid,
    performed_by_name: caller.name ?? caller.email,
    created_at: now,
  });

  return NextResponse.json(doc, { status: 201 });
}
