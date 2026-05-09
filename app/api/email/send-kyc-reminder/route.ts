import { errorResponse } from "@/lib/api/error";
/**
 * POST /api/email/send-kyc-reminder
 * ─────────────────────────────────────────────────────────────────────────────
 * Send a KYC document request reminder email to a customer.
 * Allowed roles: admin, manager, employee.
 *
 * Body:
 * {
 *   customer_id: string;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { emailService } from "@/lib/services/email.service";
import { protect } from "@/lib/api/protect";

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  let body: { customer_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.customer_id) {
    return NextResponse.json({ error: "Missing `customer_id`" }, { status: 422 });
  }

  try {
    // ── Fetch customer ──
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", body.customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 422 });
    }

    // Default Customer Portal URL
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001/dashboard/profile";
    const senderName = caller.name || "Your Insurance Agent";

    // ── Send KYC request email ──
    const result = await emailService.sendKycReminder(customer.email, {
      customerName: customer.name || "Valued Customer",
      portalUrl,
      senderName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
        { status: 500 }
      );
    }

    // ── Audit log ──
    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        action: "email_reminder",
        module: "kyc",
        details: `Sent KYC reminder email to ${customer.email} (Customer ID: ${body.customer_id})`,
        created_at: new Date().toISOString(),
      });
      
      // Also log in communication logs for tracking
      await supabaseAdmin.from("communication_logs").insert({
        customer_id: customer.id,
        customer_name: customer.name,
        channel: "email",
        recipient: customer.email,
        subject: "Action Required: Please Upload Your KYC Documents",
        body: "KYC reminder sent via system.",
        status: "sent",
        sent_at: new Date().toISOString(),
        created_by: caller.uid,
      });
    } catch (auditErr) {
      console.error("[send-kyc-reminder] Log failed:", auditErr);
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: customer.email,
    });
  } catch (err: unknown) {
    console.error("[send-kyc-reminder] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
