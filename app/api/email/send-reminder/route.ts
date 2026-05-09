/**
 * POST /api/email/send-reminder
 * ─────────────────────────────────────────────────────────────────────────────
 * Send a payment / renewal / expiry reminder email to a customer.
 *
 * Allowed roles: admin, manager, employee (employee only for their assigned policies).
 *
 * Body:
 * {
 *   policy_id: string;          // Required — the policy to remind about
 *   renewal_id?: string;        // Optional — if reminding about a specific renewal
 *   type: "policy_expiry" | "payment_due";  // Reminder type
 * }
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { emailService, setEmailCompanyName, setEmailCompanyEmail, setEmailCompanyPhone, setPolicyEmailTemplate, setRenewalEmailTemplate } from "@/lib/services/email.service";
import { protect } from "@/lib/api/protect";

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  // Allow admin, manager, AND employee
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  // ── Parse body ──
  let body: { policy_id: string; renewal_id?: string; type: "policy_expiry" | "payment_due" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.policy_id) {
    return NextResponse.json({ error: "Missing `policy_id`" }, { status: 422 });
  }

  if (!body.type || !["policy_expiry", "payment_due"].includes(body.type)) {
    return NextResponse.json(
      { error: "Invalid `type`. Must be 'policy_expiry' or 'payment_due'" },
      { status: 422 }
    );
  }

  try {
    // ── Read email settings ──
    const { data: configs } = await supabaseAdmin
      .from("system_config")
      .select("key, value")
      .in("key", [
        "company_name",
        "email_notifications_enabled",
        "company_email",
        "company_phone",
        "policy_email_template",
        "renewal_email_template",
      ]);

    const configMap = Object.fromEntries((configs || []).map((c) => [c.key, c.value]));
    if (configMap.company_name) setEmailCompanyName(String(configMap.company_name));
    if (configMap.company_email) setEmailCompanyEmail(String(configMap.company_email));
    if (configMap.company_phone) setEmailCompanyPhone(String(configMap.company_phone));
    if (configMap.policy_email_template) setPolicyEmailTemplate(String(configMap.policy_email_template));
    if (configMap.renewal_email_template) setRenewalEmailTemplate(String(configMap.renewal_email_template));
    const emailEnabled = configMap.email_notifications_enabled !== "false";
    if (!emailEnabled) {
      return NextResponse.json({ error: "Email notifications are disabled in settings" }, { status: 403 });
    }

    // ── Fetch policy ──
    const { data: policy, error: policyError } = await supabaseAdmin
      .from("policies")
      .select("*")
      .eq("id", body.policy_id)
      .single();

    if (policyError || !policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // ── Employee permission check: can only remind for their assigned policies ──
    if (caller.role === "employee" && policy.assigned_to !== caller.uid) {
      return NextResponse.json(
        { error: "You can only send reminders for policies assigned to you" },
        { status: 403 }
      );
    }

    // ── Fetch customer ──
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", policy.customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 422 });
    }

    // ── Fetch assigned agent info ──
    let agentName = "Your Insurance Agent";
    let agentPhone: string | undefined;
    if (policy.assigned_to) {
      const { data: agent } = await supabaseAdmin
        .from("users")
        .select("name, phone")
        .eq("id", policy.assigned_to)
        .single();
      if (agent) {
        agentName = agent.name || agentName;
        agentPhone = agent.phone ?? undefined;
      }
    }

    // ── Fetch renewal if provided ──
    let renewalDueDate: string | undefined;
    if (body.renewal_id) {
      const { data: renewal } = await supabaseAdmin
        .from("renewals")
        .select("due_date")
        .eq("id", body.renewal_id)
        .single();
      if (renewal?.due_date) {
        const d = new Date(renewal.due_date);
        renewalDueDate = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }

    // ── Format dates ──
    const endDate = policy.end_date ? new Date(policy.end_date) : null;

    const expiryDateStr = endDate
      ? endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "N/A";

    const daysRemaining = endDate
      ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    // ── Format premium ──
    const premiumAmount = policy.premium_amount
      ? Number(policy.premium_amount).toLocaleString("en-IN")
      : "N/A";

    // ── Send email based on type ──
    let result;

    if (body.type === "policy_expiry") {
      result = await emailService.sendPolicyExpiryReminder(customer.email, {
        customerName: customer.name || "Valued Customer",
        policyNumber: policy.policy_number || "N/A",
        policyType: policy.policy_type || "Insurance",
        expiryDate: expiryDateStr,
        daysRemaining: Math.max(daysRemaining, 0),
        agentName,
        agentPhone,
      });
    } else {
      // payment_due — use the dedicated payment reminder template
      result = await emailService.sendPaymentReminder(customer.email, {
        customerName: customer.name || "Valued Customer",
        policyNumber: policy.policy_number || "N/A",
        policyType: policy.policy_type || "Insurance",
        premiumAmount,
        dueDate: renewalDueDate || expiryDateStr,
        daysOverdue: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
        agentName,
        agentPhone,
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
        { status: 500 }
      );
    }

    // ── Audit log ──
    try {
      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        action: "email_reminder",
        module: body.type === "policy_expiry" ? "policies" : "renewals",
        details: `Sent ${body.type} reminder email to ${customer.email} for policy ${policy.policy_number}`,
        created_at: new Date().toISOString(),
      });
      if (auditError) console.error("[send-reminder] Audit log failed:", auditError);
    } catch {
      // Non-critical — don't fail the request
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: customer.email,
    });
  } catch (err: unknown) {
    console.error("[send-reminder] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
