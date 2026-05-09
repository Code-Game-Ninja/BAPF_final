/**
 * GET  /api/leads/[id]/documents   — List documents for a lead
 * POST /api/leads/[id]/documents   — Add document metadata to a lead
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

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
  if (!leadId) {
    return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });
  }

  // Employee can only access their assigned leads
  const accessDenied = await verifyLeadAccess(leadId, caller);
  if (accessDenied) return accessDenied;

  try {
    const { data, error } = await supabaseAdmin
      .from("lead_documents")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[lead-docs/GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    console.error("[lead-docs/GET] Error:", err);
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
  if (!leadId) {
    return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });
  }

  // Employee can only upload to their assigned leads
  const accessDenied = await verifyLeadAccess(leadId, caller);
  if (accessDenied) return accessDenied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const file_name = body.file_name as string;
  const file_path = body.file_path as string;
  const file_url = body.file_url as string;

  if (!file_name || !file_path || !file_url) {
    return NextResponse.json(
      { error: "file_name, file_path, and file_url are required" },
      { status: 400 }
    );
  }

  // Prevent stored XSS via javascript: URIs
  if (!/^https?:\/\//i.test(file_url)) {
    return NextResponse.json(
      { error: "file_url must be a valid HTTP(S) URL" },
      { status: 400 }
    );
  }

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("lead_documents")
      .insert({
        lead_id: leadId,
        file_name,
        file_path,
        file_url,
        file_size: (body.file_size as number) || null,
        document_type: (body.document_type as string) || "general",
        uploaded_by: caller.uid,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("[lead-docs/POST] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add timeline entry
    await supabaseAdmin.from("lead_timeline").insert({
      lead_id: leadId,
      action: "document_uploaded",
      description: `Document uploaded: ${file_name}`,
      performed_by: caller.uid,
      performed_by_name: caller.name ?? caller.email,
      created_at: now,
      updated_at: now,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error("[lead-docs/POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
