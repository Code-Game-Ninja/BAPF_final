/**
 * GET /api/gmc/[customerId]/ecard-template
 * PUT /api/gmc/[customerId]/ecard-template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ customerId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;

  const { data, error } = await supabaseAdmin
    .from("gmc_ecard_templates")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.company_name) {
    return NextResponse.json({ error: "company_name is required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("gmc_ecard_templates")
    .upsert({
      customer_id: customerId,
      company_name: body.company_name,
      tpa_name: (body.tpa_name as string) || null,
      tpa_contact: (body.tpa_contact as string) || null,
      tpa_email: (body.tpa_email as string) || null,
      emergency_contact: (body.emergency_contact as string) || null,
      logo_url: (body.logo_url as string) || null,
      logo_path: (body.logo_path as string) || null,
      additional_fields: (body.additional_fields as object) || {},
      created_by: caller.uid,
      updated_at: now,
    } as any, { onConflict: "customer_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
