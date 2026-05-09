/**
 * GET  /api/renewals/config  — Get renewal window config
 * PUT  /api/renewals/config  — Update renewal window config (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api/error";
import { renewalConfigSchema } from "@/lib/validations/renewal";

const CONFIG_KEY = "renewal_window_config";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { data } = await supabaseAdmin
    .from("system_config")
    .select("*")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  const defaultConfig = {
    default_window_days: 90,
    per_type: {} as Record<string, number>,
  };

  const val = data?.value;
  return NextResponse.json(val ?? defaultConfig);
}

export async function PUT(req: NextRequest) {
  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = renewalConfigSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const configValue = result.data;
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("system_config")
    .upsert(
      {
        key: CONFIG_KEY,
        value: configValue as any, // Value is jsonb
        category: "renewals",
        description: "Renewal pipeline window configuration",
        updated_at: now,
      },
      { onConflict: "key" }
    );

  if (error) return errorResponse(error.message, 500);

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "config_change",
      module: "renewals",
      details: `Updated renewal window config: default=${configValue.default_window_days} days`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: configValue as any,
      created_at: now,
    });
  } catch (auditErr) {
    console.error("[renewals config] Audit log failed:", auditErr);
  }

  return NextResponse.json(configValue);
}
