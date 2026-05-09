/**
 * GET /api/fleet/[customerId]/endorsements — list Fleet vehicle endorsements
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

const db = supabaseAdmin as any;

type Params = { params: Promise<{ customerId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;

  const { data, error } = await db
    .from("fleet_vehicle_endorsements")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
