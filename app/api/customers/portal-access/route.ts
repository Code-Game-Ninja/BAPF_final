/**
 * POST /api/customers/portal-access
 *
 * Enable or disable a customer's portal login access.
 * Does NOT soft-delete the customer — only toggles Supabase Auth ban state
 * and the is_active flag in customer_portal_users.
 *
 * Body: { portalUserId, action: "enable" | "disable" }
 * Auth: Admin only
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { portalUserId, action } = body as {
    portalUserId: string;
    action: "enable" | "disable";
  };

  if (!portalUserId || !["enable", "disable"].includes(action)) {
    return NextResponse.json(
      { error: "Missing or invalid fields: portalUserId, action (enable|disable)" },
      { status: 400 }
    );
  }

  try {
    const { data: portalUser, error: portalError } = await supabaseAdmin
      .from("customer_portal_users")
      .select("*")
      .eq("id", portalUserId)
      .single();

    if (portalError || !portalUser) {
      return NextResponse.json({ error: "Portal user not found" }, { status: 404 });
    }

    const authUserId = portalUser.auth_user_id;
    const isDisabling = action === "disable";
    const now = new Date().toISOString();

    // Update Supabase Auth - use ban_duration for disabling
    if (authUserId) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        ban_duration: isDisabling ? "876600h" : "none", // ~100 years or no ban
      });
      if (authUpdateError) {
        console.error("[portal-access] Failed to update auth user:", authUpdateError);
        return NextResponse.json({ error: "Failed to update auth user" }, { status: 500 });
      }
    }

    // Update database
    const { error: dbUpdateError } = await supabaseAdmin
      .from("customer_portal_users")
      .update({
        is_active: !isDisabling,
        ...(isDisabling
          ? {
              deactivated_at: now,
              deactivated_by: caller.uid,
            }
          : {
              reactivated_at: now,
              reactivated_by: caller.uid,
            }),
        updated_at: now,
      })
      .eq("id", portalUserId);

    if (dbUpdateError) {
      console.error("[portal-access] Failed to update portal user:", dbUpdateError);
      return NextResponse.json({ error: "Failed to update portal user record" }, { status: 500 });
    }

    // Audit log
    try {
      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
        action: isDisabling ? "deactivate" : "update",
        module: "customers",
        details: `${isDisabling ? "Disabled" : "Enabled"} portal access for: ${portalUser.name} (${portalUser.email})`,
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        metadata: {
          portal_user_id: portalUserId,
          customer_id: portalUser.customer_id,
          customer_name: portalUser.name,
          action,
        },
        created_at: now,
      });
      if (auditError) console.error("[portal-access] Audit log failed:", auditError);
    } catch (auditErr) {
      console.error("[portal-access] Audit log failed:", auditErr);
    }

    return NextResponse.json({
      success: true,
      is_active: !isDisabling,
      message: `Portal access ${isDisabling ? "disabled" : "enabled"} for ${portalUser.name}.`,
    });
  } catch (err: unknown) {
    console.error("[portal-access] Error:", err);
    return NextResponse.json({ error: "Failed to update portal access" }, { status: 500 });
  }
}
