import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClaimSchema } from "@/lib/validation";
import { protect } from "@/lib/api/protect";

// ── GET ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const claim_type = searchParams.get("claim_type");
  const search = searchParams.get("search");

  let query = supabaseAdmin
    .from("claims")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (claim_type) query = query.eq("claim_type", claim_type);
  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,claim_number.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── POST ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = createClaimSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.format() }, { status: 400 });
  }

  const validatedData = result.data;
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("claims")
    .insert({
      ...validatedData,
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "claim.create",
      module: "claims",
      details: `Created claim ${validatedData.claim_number}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { claim_id: data.id, claim_number: data.claim_number },
      created_at: now,
    });
  } catch (auditErr) {
    console.error("[claims/POST] Audit log failed:", auditErr);
  }

  return NextResponse.json(data, { status: 201 });
}
