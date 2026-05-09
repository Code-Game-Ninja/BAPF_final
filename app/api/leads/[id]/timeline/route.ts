/**
 * GET  /api/leads/[id]/timeline   — List timeline entries for a lead
 * POST /api/leads/[id]/timeline   — Add a note/entry to the lead timeline
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
      .from("lead_timeline")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[timeline/GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    console.error("[timeline/GET] Error:", err);
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

  // Employee can only add to their assigned leads
  const accessDenied = await verifyLeadAccess(leadId, caller);
  if (accessDenied) return accessDenied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = (body.action as string) || "note_added";
  const description = body.description as string;
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("lead_timeline")
      .insert({
        lead_id: leadId,
        action,
        description: description.trim(),
        old_value: (body.old_value as string) || null,
        new_value: (body.new_value as string) || null,
        next_action: (body.next_action as string) || null,
        performed_by: caller.uid,
        performed_by_name: caller.name ?? caller.email,
        metadata: (body.metadata as Record<string, unknown>) || {},
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("[timeline/POST] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error("[timeline/POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
