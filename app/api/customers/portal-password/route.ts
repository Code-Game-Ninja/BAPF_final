/**
 * POST /api/customers/portal-password
 *
 * Change/reset a customer portal user's password.
 * 1. Generate new password or use provided one
 * 2. Update Supabase Auth password
 * 3. Update stored password in customer_portal_users
 *
 * Body: { portalUserId, newPassword? }
 * Auth: Admin only
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import crypto from "crypto";

// ── Password generator ────────────────────────────────────────────────────────

function generatePassword(length = 10): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$!";
  const all = upper + lower + digits + symbols;

  let password = "";
  password += upper[crypto.randomInt(upper.length)];
  password += lower[crypto.randomInt(lower.length)];
  password += digits[crypto.randomInt(digits.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Fisher-Yates shuffle for unbiased randomization
  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { portalUserId, newPassword } = body as {
    portalUserId: string;
    newPassword?: string;
  };

  if (!portalUserId) {
    return NextResponse.json(
      { error: "Missing portalUserId" },
      { status: 400 }
    );
  }

  try {
    // Get the portal user
    const { data: portalUser, error: portalError } = await supabaseAdmin
      .from("customer_portal_users")
      .select("*")
      .eq("id", portalUserId)
      .single();

    if (portalError || !portalUser) {
      return NextResponse.json(
        { error: "Portal user not found" },
        { status: 404 }
      );
    }

    const authUserId = portalUser.auth_user_id;

    // Use provided password or generate a new one
    const password = newPassword?.trim() || generatePassword(10);

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Update Supabase Auth password
    if (authUserId) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
      if (authUpdateError) {
        console.error("[portal-password] Failed to update auth password:", authUpdateError);
        return NextResponse.json({ error: "Failed to update auth password" }, { status: 500 });
      }
    }

    const now = new Date().toISOString();

    // Update stored password in database
    const { error: dbUpdateError } = await supabaseAdmin
      .from("customer_portal_users")
      .update({
        portal_password: password,
        password_changed_at: now,
        password_changed_by: caller.uid,
        updated_at: now,
      })
      .eq("id", portalUserId);

    if (dbUpdateError) {
      console.error("[portal-password] Failed to update DB password:", dbUpdateError);
      return NextResponse.json({ error: "Failed to update password record" }, { status: 500 });
    }

    // Audit log
    try {
      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
        action: "update",
        module: "customers",
        details: `Changed portal password for: ${portalUser.name} (${portalUser.email})`,
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        metadata: {
          portal_user_id: portalUserId,
          customer_id: portalUser.customer_id,
          customer_name: portalUser.name,
        },
        created_at: now,
      });
      if (auditError) console.error("[portal-password] Audit log failed:", auditError);
    } catch (auditErr) {
      console.error("[portal-password] Audit log failed:", auditErr);
    }

    return NextResponse.json({
      success: true,
      portal_password: password,
      message: "Password updated successfully.",
    });
  } catch (err: unknown) {
    console.error("[portal-password] Error:", err);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}
