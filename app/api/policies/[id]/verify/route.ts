/**
 * POST /api/policies/[id]/verify
 * ─────────────────────────────────────────────────────────────────────────────
 * Record a policy verification by the employee, then mark it confirmed.
 * Creates an immutable entry in `policy_verification_log`.
 *
 * Body:
 * {
 *   checks: {
 *     policyNumberCorrect: boolean,
 *     datesCorrect: boolean,
 *     premiumCorrect: boolean,
 *     customerCorrect: boolean,
 *   }
 * }
 *
 * Rules:
 *   - Any authenticated user can verify
 *   - Checks object is required and all 4 keys must be true
 *   - Creates log entry with role + timestamp (immutable — no update/delete)
 *   - Marks policy.verification_confirmed = true
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";

type Params = { params: Promise<{ id: string }> };

interface VerificationChecks {
  policyNumberCorrect: boolean;
  datesCorrect: boolean;
  premiumCorrect: boolean;
  customerCorrect: boolean;
}

export async function POST(req: NextRequest, { params }: Params) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  const { id } = await params;
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  let body: { checks: VerificationChecks };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { checks } = body;
  if (!checks) {
    return NextResponse.json({ error: "Missing `checks` object in body" }, { status: 400 });
  }

  const requiredChecks: (keyof VerificationChecks)[] = [
    "policyNumberCorrect",
    "datesCorrect",
    "premiumCorrect",
    "customerCorrect",
  ];
  for (const k of requiredChecks) {
    if (typeof checks[k] !== "boolean") {
      return NextResponse.json(
        { error: `Missing or non-boolean check: ${k}` },
        { status: 422 }
      );
    }
  }

  // All checks must be true to confirm
  const allPassed = requiredChecks.every((k) => checks[k] === true);
  if (!allPassed) {
    const failed = requiredChecks.filter((k) => !checks[k]);
    return NextResponse.json(
      { error: `Verification failed. Unchecked items: ${failed.join(", ")}` },
      { status: 422 }
    );
  }

  // Ensure policy exists
  const { data: policy, error: policyError } = await supabaseAdmin
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();

  if (policyError || !policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // 1. Write immutable verification log
  const { data: logEntry, error: logError } = await supabaseAdmin
    .from("policy_verification_logs")
    .insert({
      policy_id: id,
      verified_by: caller.uid,
      checks,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (logError) {
    console.error("[verify] Failed to create log:", logError);
    return NextResponse.json({ error: "Failed to create verification log" }, { status: 500 });
  }

  // 2. Mark policy verified
  const { error: policyUpdateError } = await supabaseAdmin
    .from("policies")
    .update({
      verification_confirmed: true,
      verification_confirmed_by: caller.uid,
      verification_confirmed_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (policyUpdateError) {
    console.error("[verify] Failed to update policy verification:", policyUpdateError);
    return NextResponse.json({ error: "Failed to mark policy as verified" }, { status: 500 });
  }

  // 3. Audit log
  try {
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      action: "policy.verify",
      module: "policies",
      details: `Verified policy ${policy.policy_number}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: { policy_id: id, policy_number: policy.policy_number, log_id: logEntry?.id },
      created_at: now,
    });
    if (auditError) console.error("[verify] Audit log failed:", auditError);
  } catch (auditErr) {
    console.error("[verify] Audit log failed:", auditErr);
  }

  return NextResponse.json({ verified: true, log_id: logEntry?.id });
}
