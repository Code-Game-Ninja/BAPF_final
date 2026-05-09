/**
 * GET  /api/service-desk/templates — List templates
 * POST /api/service-desk/templates — Create template (admin/manager only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

export async function GET(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000, skipCsrf: true });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { data, error } = await supabaseAdmin
    .from("ticket_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.category) {
    return NextResponse.json({ error: "Missing required fields: name, category" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("ticket_templates")
    .insert({
      name: body.name as string,
      category: body.category as string,
      priority: (body.priority as string) ?? "medium",
      description_template: (body.description_template as string) ?? null,
      internal_notes_template: (body.internal_notes_template as string) ?? null,
      created_by: caller.uid,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
