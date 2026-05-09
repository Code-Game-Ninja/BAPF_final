/**
 * POST /api/renewals/bulk
 * Bulk operations: assign RM, stage update, export CSV.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

interface BulkRequestBody {
  action: "assign_rm" | "update_stage" | "export_csv";
  ids: string[];
  rm_id?: string;
  stage?: string;
  lost_reason?: string;
}

interface RenewalRecord {
  id: string;
  stage: string;
}

interface ExportRenewal {
  stage: string;
  risk_score: number | null;
  last_contact_date: string | null;
  entered_pipeline_at: string | null;
  policies?: {
    policy_number: string;
    policy_type: string;
    end_date: string;
    premium_amount: number;
    insurer_name: string;
  };
  customers?: {
    name: string;
    phone: string;
    email: string;
  };
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  let body: BulkRequestBody;
  try {
    body = (await req.json()) as BulkRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, ids, rm_id, stage, lost_reason } = body;

  if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "action and ids[] are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const results = { success: 0, failed: 0, errors: [] as string[] };

  if (action === "assign_rm") {
    if (!rm_id) return NextResponse.json({ error: "rm_id is required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("renewal_pipeline")
      .update({ assigned_rm: rm_id, updated_at: now })
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    results.success = ids.length;

    // Audit log
    try {
      await supabaseAdmin.from("audit_logs").insert({
        action: "update",
        module: "renewals",
        details: `Bulk assigned RM ${rm_id} to ${ids.length} renewals`,
        user_id: caller.uid,
        user_name: caller.name ?? caller.email,
        user_role: caller.role,
        metadata: { ids, rm_id },
        created_at: now,
      });
    } catch { /* non-critical */ }
  } else if (action === "update_stage") {
    if (!stage) return NextResponse.json({ error: "stage is required" }, { status: 400 });
    if (stage === "lost" && !lost_reason) {
      return NextResponse.json({ error: "lost_reason required for lost stage" }, { status: 400 });
    }

    const TERMINAL_STAGES = ["renewed", "lost"];
    const updatePayload: Record<string, string | null> = { stage, stage_updated_at: now, updated_at: now };
    if (stage === "lost" && lost_reason) updatePayload.lost_reason = lost_reason;

    // Fetch current stages to validate transitions
    const { data: current } = await supabaseAdmin
      .from("renewal_pipeline")
      .select("id, stage")
      .in("id", ids) as { data: RenewalRecord[] | null };

    for (const renewal of current ?? []) {
      if (TERMINAL_STAGES.includes(renewal.stage)) {
        results.failed++;
        results.errors.push(`Renewal ${renewal.id} is in terminal stage '${renewal.stage}'`);
        continue;
      }

      const { error } = await supabaseAdmin
        .from("renewal_pipeline")
        .update(updatePayload)
        .eq("id", renewal.id);

      if (error) {
        results.failed++;
        results.errors.push(`Failed to update ${renewal.id}: ${error.message}`);
      } else {
        results.success++;
        // Stage history
        await supabaseAdmin.from("renewal_stage_history").insert({
          renewal_id: renewal.id,
          from_stage: renewal.stage,
          to_stage: stage,
          changed_by: caller.uid,
          changed_by_name: caller.name ?? caller.email,
          notes: "Bulk stage update",
          created_at: now,
        });
      }
    }
  } else if (action === "export_csv") {
    const { data: renewals } = await supabaseAdmin
      .from("renewal_pipeline")
      .select(
        `
        stage, risk_score, last_contact_date, entered_pipeline_at,
        policies!renewal_pipeline_policy_id_fkey(policy_number, policy_type, end_date, premium_amount, insurer_name),
        customers!renewal_pipeline_customer_id_fkey(name, phone, email)
      `
      )
      .in("id", ids) as { data: ExportRenewal[] | null };

    const rows = [
      ["Customer", "Phone", "Policy #", "Type", "Insurer", "Expiry", "Premium", "Stage", "Risk Score", "Last Contact"],
      ...(renewals ?? []).map((r) => [
        r.customers?.name ?? "",
        r.customers?.phone ?? "",
        r.policies?.policy_number ?? "",
        r.policies?.policy_type ?? "",
        r.policies?.insurer_name ?? "",
        r.policies?.end_date ?? "",
        r.policies?.premium_amount ?? "",
        r.stage,
        r.risk_score ?? "",
        r.last_contact_date ?? "",
      ]),
    ];

    const csv = rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="renewals-export-${Date.now()}.csv"`,
      },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json(results);
}
