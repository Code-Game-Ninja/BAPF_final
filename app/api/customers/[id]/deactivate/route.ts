/**
 * POST /api/customers/[id]/deactivate
 *
 * Soft-delete a customer:
 * 1. Mark customer document as inactive in database
 * 2. Disable the Supabase Auth portal account (if any)
 * 3. Mark customer_portal_users record as inactive
 *
 * Auth: Admin only
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: customerId } = await params;

  if (!customerId) {
    return NextResponse.json(
      { error: "Missing customer ID" },
      { status: 400 }
    );
  }

  try {
    const now = new Date().toISOString();

    // 1. Get and mark customer as inactive
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update({
        status: "inactive",
        deleted_at: now,
        deleted_by: caller.uid,
        updated_at: now,
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("[deactivate] Failed to update customer:", updateError);
      return NextResponse.json(
        { error: "Failed to deactivate customer" },
        { status: 500 }
      );
    }

    // 2. Find and disable portal account
    let portalDisabled = false;
    const { data: portalUsers } = await supabaseAdmin
      .from("customer_portal_users")
      .select("*")
      .eq("customer_id", customerId)
      .limit(1);

    if (portalUsers && portalUsers.length > 0) {
      const portalUser = portalUsers[0];

      // Disable Supabase Auth user (using auth_user_id which is the supabase auth id)
      if (portalUser.auth_user_id) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(portalUser.auth_user_id, {
            ban_duration: "876600h", // ~100 years (effectively disabled)
          });
          portalDisabled = true;
        } catch (authErr) {
          console.error(
            "[deactivate] Failed to disable Supabase Auth user:",
            authErr
          );
        }
      }

      // Mark portal user as inactive
      const { error: portalUpdateError } = await supabaseAdmin
        .from("customer_portal_users")
        .update({
          is_active: false,
          deactivated_at: now,
          deactivated_by: caller.uid,
          updated_at: now,
        })
        .eq("id", portalUser.id);

      if (portalUpdateError) {
        console.error("[deactivate] Failed to update portal user:", portalUpdateError);
        return NextResponse.json(
          { error: "Failed to deactivate portal user" },
          { status: 500 }
        );
      }
    }

    // 3. Deactivate Phase 3 GMC members and Fleet vehicles (data integrity cascade)
    const db = supabaseAdmin as any;
    try {
      await db
        .from("gmc_members")
        .update({ status: "Inactive", deactivated_at: now, updated_at: now })
        .eq("customer_id", customerId)
        .eq("status", "Active");
    } catch { /* non-critical — Phase 3 tables may not exist yet */ }

    try {
      await db
        .from("fleet_vehicles")
        .update({ status: "Inactive", deactivated_at: now, updated_at: now })
        .eq("customer_id", customerId)
        .eq("status", "Active");
    } catch { /* non-critical — Phase 3 tables may not exist yet */ }

    // 4. Audit log (best-effort — don't fail the request if logging fails)
    try {
      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
        action: "deactivate",
        module: "customers",
        details: `Deactivated customer: ${customer?.name} (soft-deleted)`,
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        metadata: {
          customer_name: customer?.name,
          portal_disabled: portalDisabled,
        },
        created_at: now,
      });
      if (auditError) console.error("[deactivate] Audit log failed:", auditError);
    } catch (auditErr) {
      console.error("[deactivate] Failed to write audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      portal_disabled: portalDisabled,
      message: `Customer deactivated successfully${
        portalDisabled ? " (portal login disabled)" : ""
      }`,
    });
  } catch (err: unknown) {
    console.error("[deactivate] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
