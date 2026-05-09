/**
 * POST /api/quotes/[id]/quotes
 * Add a quote to a quote request.
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

  const {
    insurer_name,
    premium_amount,
    sum_insured,
    coverage_details,
    terms,
    validity_date,
    document_url,
    document_path,
    is_recommended,
  } = body;

  if (!insurer_name || !premium_amount || !sum_insured || !validity_date) {
    return NextResponse.json(
      { error: "insurer_name, premium_amount, sum_insured, and validity_date are required" },
      { status: 400 }
    );
  }

  if (premium_amount <= 0) {
    return NextResponse.json({ error: "premium_amount must be positive" }, { status: 400 });
  }

  if (sum_insured <= 0) {
    return NextResponse.json({ error: "sum_insured must be positive" }, { status: 400 });
  }

  // Verify quote request exists
  const { data: qr } = await db
    .from("quote_requests")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!qr) return NextResponse.json({ error: "Quote request not found" }, { status: 404 });

  const now = new Date().toISOString();

  const { data: quote, error } = await db
    .from("quotes")
    .insert({
      quote_request_id: id,
      insurer_name,
      premium_amount,
      sum_insured,
      coverage_details: coverage_details ?? null,
      terms: terms ?? null,
      validity_date,
      document_url: document_url ?? null,
      document_path: document_path ?? null,
      is_recommended: is_recommended ?? false,
      is_accepted: false,
      is_expired: false,
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update quote request status to quotes_received
  await db
    .from("quote_requests")
    .update({ status: "quotes_received", updated_at: now })
    .eq("id", id)
    .eq("status", "open");

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create",
      module: "quotes",
      details: `Added quote from ${insurer_name} to request ${id}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { quote_id: quote.id, quote_request_id: id, insurer_name },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json(quote, { status: 201 });
}
