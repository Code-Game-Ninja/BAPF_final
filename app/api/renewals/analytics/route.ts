/**
 * GET /api/renewals/analytics
 * Returns analytics: stage counts, conversion rate, premium at risk.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;

  const { data: pipeline, error } = await db
    .from("renewal_pipeline")
    .select(
      `
      stage,
      policies!renewal_pipeline_policy_id_fkey(premium_amount, policy_type, insurer_name, assigned_to_name)
    `
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = pipeline ?? [];

  // Stage counts
  const stageCounts: Record<string, number> = {
    due: 0,
    contacted: 0,
    negotiating: 0,
    renewed: 0,
    lost: 0,
  };

  let premiumAtRisk = 0;
  let premiumRenewed = 0;

  for (const entry of entries) {
    const stage = entry.stage as string;
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;

    const premium = entry.policies?.premium_amount ?? 0;
    if (stage !== "renewed" && stage !== "lost") {
      premiumAtRisk += premium;
    }
    if (stage === "renewed") {
      premiumRenewed += premium;
    }
  }

  const total = entries.length;
  const renewed = stageCounts.renewed ?? 0;
  const lost = stageCounts.lost ?? 0;
  const closed = renewed + lost;
  const conversionRate = closed > 0 ? Math.round((renewed / closed) * 100) : 0;

  // Breakdown by policy type
  const byPolicyType: Record<string, number> = {};
  const byInsurer: Record<string, number> = {};
  const byRM: Record<string, number> = {};

  for (const entry of entries) {
    const pt = entry.policies?.policy_type ?? "other";
    byPolicyType[pt] = (byPolicyType[pt] ?? 0) + 1;

    const ins = entry.policies?.insurer_name ?? "Unknown";
    byInsurer[ins] = (byInsurer[ins] ?? 0) + 1;

    const rm = entry.policies?.assigned_to_name ?? "Unassigned";
    byRM[rm] = (byRM[rm] ?? 0) + 1;
  }

  return NextResponse.json({
    stageCounts,
    total,
    conversionRate,
    premiumAtRisk,
    premiumRenewed,
    byPolicyType,
    byInsurer,
    byRM,
  });
}
