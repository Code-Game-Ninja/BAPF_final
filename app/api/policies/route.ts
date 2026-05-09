import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import { createPolicySchema } from "@/lib/validation";

interface PolicyRequestBody {
  customer_id: string;
  customer_name: string;
  policy_type: string;
  policy_number?: string;
  insurer_name?: string;
  premium_amount: number;
  sum_insured?: number;
  start_date: string;
  end_date: string;
  status?: "active" | "expired" | "cancelled" | "pending" | "lapsed";
  payment_frequency?: "monthly" | "quarterly" | "half_yearly" | "yearly" | "single";
  pdf_url?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  remark?: string;
  branch_id?: string;
  campaign_id?: string;
  motor_category?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  health_policy_type?: string;
  plan_name?: string;
  life_plan_type?: string;
  risk_location?: string;
  marine_policy_type?: string;
  liability_type?: string;
  policy_tenure?: string | number;
  project_name?: string;
  project_location?: string;
  principal?: string;
  surety_bond_type?: string;
  verification_confirmed?: boolean;
}

// ── Auto policy number (atomic — uses RPC to avoid race conditions) ──

async function getPolicyPrefix(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", "policy_number_prefix")
    .maybeSingle();
  if (data?.value && typeof data.value === "string" && data.value.trim()) {
    return data.value.trim().toUpperCase();
  }
  return "POL";
}

async function isAutoGenerateEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", "auto_generate_policy_number")
    .maybeSingle();
  if (data?.value === "false") return false;
  return true;
}

async function nextPolicyNumber(type: string): Promise<string> {
  const prefix = await getPolicyPrefix();
  const year = new Date().getFullYear();
  const counterKey = `policy_counter_${type}_${year}`;

  // Atomic increment via DB function — no read-then-write race
  const { data: nextCount, error: rpcError } = await supabaseAdmin.rpc(
    "increment_policy_counter",
    { counter_key: counterKey, policy_type: type, policy_year: year }
  );

  if (rpcError || nextCount == null) {
    console.error("[nextPolicyNumber] RPC failed, falling back:", rpcError);
    // Fallback: read-then-upsert (legacy, not atomic)
    const { data: existing } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", counterKey)
      .maybeSingle();

    let fallbackCount = 1;
    if (existing?.value && typeof existing.value === "object" && existing.value !== null && "count" in existing.value) {
      fallbackCount = (existing.value as { count: number }).count + 1;
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("system_config")
      .upsert({
        key: counterKey,
        value: { count: fallbackCount, type, year },
        category: "counters",
        updated_at: now,
      }, { onConflict: "key" });

    return `${prefix}-${year}-${String(fallbackCount).padStart(4, "0")}`;
  }

  return `${prefix}-${year}-${String(nextCount).padStart(4, "0")}`;
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  let body: PolicyRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Employees must upload a PDF before creating a policy
  if (caller.role === "employee" && !body.pdf_url) {
    return NextResponse.json(
      { error: "Employees must attach a PDF document before creating a policy." },
      { status: 400 }
    );
  }

  const result = createPolicySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.format() }, { status: 400 });
  }

  const validatedData = result.data;
  const policyType = validatedData.policy_type;

  const suppliedNumber = typeof body.policy_number === "string" && body.policy_number.trim()
    ? body.policy_number.trim()
    : null;

  let policyNumber: string;
  if (suppliedNumber) {
    policyNumber = suppliedNumber;
  } else {
    const autoGen = await isAutoGenerateEnabled();
    if (!autoGen) {
      return NextResponse.json(
        { error: "Auto-generate policy numbers is disabled. Please provide a policy number." },
        { status: 400 }
      );
    }
    policyNumber = await nextPolicyNumber(policyType);
  }

  const isEmployee = caller.role === "employee";
  const now = new Date().toISOString();

  const payload = {
    policy_number: policyNumber,
    policy_type: policyType,
    customer_id: validatedData.customer_id,
    customer_name: validatedData.customer_name,
    start_date: validatedData.start_date,
    end_date: validatedData.end_date,
    premium_amount: validatedData.premium_amount,
    sum_insured: validatedData.sum_insured || null,
    insurer_name: validatedData.insurer_name || null,
    payment_frequency: validatedData.payment_frequency || null,
    status: validatedData.status || "active",
    assigned_to: validatedData.assigned_to || caller.uid,
    assigned_to_name: body.assigned_to_name || null,
    pdf_url: validatedData.pdf_url || null,
    locked_for_employee: isEmployee,
    verification_confirmed: validatedData.verification_confirmed || false,
    created_by_role: caller.role,
    created_by: caller.uid,
    remark: body.remark || null,
    branch_id: body.branch_id || caller.branch_id || null,
    campaign_id: body.campaign_id || null,
    motor_category: body.motor_category || null,
    vehicle_number: validatedData.vehicle_number || body.vehicle_number || null,
    vehicle_type: body.vehicle_type || null,
    health_policy_type: body.health_policy_type || null,
    plan_name: body.plan_name || null,
    life_plan_type: body.life_plan_type || null,
    risk_location: body.risk_location || null,
    marine_policy_type: body.marine_policy_type || null,
    liability_type: body.liability_type || null,
    policy_tenure: body.policy_tenure ? String(body.policy_tenure) : null,
    project_name: body.project_name || null,
    project_location: body.project_location || null,
    principal: body.principal || null,
    surety_bond_type: body.surety_bond_type || null,
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("policies")
    .insert(payload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[policies/POST] Insert failed:", insertError);
    return NextResponse.json({ error: insertError?.message || "Failed to create policy" }, { status: 500 });
  }

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "policy.create",
      module: "policies",
      details: `Created policy ${policyNumber}`,
      user_id: caller.uid,
      user_name: caller.name ?? caller.email,
      user_role: caller.role,
      metadata: {
        policy_id: inserted.id,
        policy_number: policyNumber,
        customer_name: validatedData.customer_name,
        policy_type: policyType,
      },
      created_at: now,
    });
  } catch (auditErr) {
    console.error("[policies/POST] Audit log failed:", auditErr);
  }

  // Notify the assigned employee
  const assignedTo = payload.assigned_to;
  if (assignedTo && assignedTo !== caller.uid) {
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: assignedTo,
        title: "New Policy Assigned",
        message: `Policy ${policyNumber} for ${validatedData.customer_name} has been assigned to you by ${caller.name ?? caller.email}`,
        type: "assignment",
        link: `/dashboard/policies/${inserted.id}`,
        read: false,
        created_at: now,
        updated_at: now,
      });
    } catch (notifErr) {
      console.error("[policies/POST] Notification failed:", notifErr);
    }
  }

  return NextResponse.json({ id: inserted.id, policy_number: policyNumber }, { status: 201 });
}
