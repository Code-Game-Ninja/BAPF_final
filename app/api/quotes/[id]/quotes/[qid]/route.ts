/**
 * PUT /api/quotes/[id]/quotes/[qid]
 * Update a quote.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id, qid } = await params;
  const db = supabaseAdmin as any;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updatePayload: any = { updated_at: now };

  const allowedFields = [
    "insurer_name", "premium_amount", "sum_insured", "coverage_details",
    "terms", "validity_date", "document_url", "document_path", "is_recommended",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updatePayload[field] = body[field];
    }
  }

  if (updatePayload.premium_amount !== undefined && updatePayload.premium_amount <= 0) {
    return NextResponse.json({ error: "premium_amount must be positive" }, { status: 400 });
  }

  if (updatePayload.sum_insured !== undefined && updatePayload.sum_insured <= 0) {
    return NextResponse.json({ error: "sum_insured must be positive" }, { status: 400 });
  }

  const { data: quote, error } = await db
    .from("quotes")
    .update(updatePayload)
    .eq("id", qid)
    .eq("quote_request_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update",
      module: "quotes",
      details: `Updated quote ${qid} in request ${id}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { quote_id: qid, quote_request_id: id },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(quote);
}
