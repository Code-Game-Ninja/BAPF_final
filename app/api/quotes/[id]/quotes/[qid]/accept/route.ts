/**
 * POST /api/quotes/[id]/quotes/[qid]/accept
 * Accept a quote — marks it accepted and navigates to policy creation.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id, qid } = await params;
  const db = supabaseAdmin as any;

  const now = new Date().toISOString();

  // Fetch the quote
  const { data: quote, error: fetchError } = await db
    .from("quotes")
    .select("*, quote_requests!quotes_quote_request_id_fkey(*)")
    .eq("id", qid)
    .eq("quote_request_id", id)
    .single();

  if (fetchError || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // Mark quote as accepted
  await db
    .from("quotes")
    .update({ is_accepted: true, updated_at: now })
    .eq("id", qid);

  // Update quote request status to converted
  await db
    .from("quote_requests")
    .update({ status: "converted", updated_at: now })
    .eq("id", id);

  // If linked to a renewal, update stage to negotiating
  if (quote.quote_requests?.linked_renewal_id) {
    await db
      .from("renewal_pipeline")
      .update({ stage: "negotiating", stage_updated_at: now, updated_at: now })
      .eq("id", quote.quote_requests.linked_renewal_id)
      .not("stage", "in", '("renewed","lost")');
  }

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "update",
      module: "quotes",
      details: `Accepted quote ${qid} from ${quote.insurer_name} in request ${id}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { quote_id: qid, quote_request_id: id, insurer_name: quote.insurer_name },
      created_at: now,
    } as any);
  } catch { /* non-critical */ }

  // Return quote data for policy pre-fill
  return NextResponse.json({
    quote,
    redirect_to: `/dashboard/policies/new?from_quote=${qid}&customer_id=${quote.quote_requests?.customer_id}`,
  });
}
