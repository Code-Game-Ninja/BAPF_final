/**
 * GET /api/quotes/[id]
 * Get quote request with all quotes joined.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data, error } = await db
    .from("quote_requests")
    .select(
      `
      *,
      customers!quote_requests_customer_id_fkey(id, uid, name, phone, email, type),
      quotes(*)
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Quote request not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
