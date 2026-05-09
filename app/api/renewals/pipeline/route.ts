/**
 * GET /api/renewals/pipeline
 * Returns renewal pipeline entries with filters, search, pagination.
 * Joins policies + customers.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;
  const { searchParams } = new URL(req.url);

  const stage = searchParams.get("stage") ?? "";
  const rm = searchParams.get("rm") ?? "";
  const policy_type = searchParams.get("policy_type") ?? "";
  const search = searchParams.get("search") ?? "";
  const customer = searchParams.get("customer") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const sort = searchParams.get("sort") ?? "risk_score";
  const order = searchParams.get("order") === "asc";

  let query = db
    .from("renewal_pipeline")
    .select(
      `
      *,
      policies!renewal_pipeline_policy_id_fkey(
        id, policy_number, policy_type, end_date, premium_amount,
        sum_insured, insurer_name, status, assigned_to, assigned_to_name
      ),
      customers!renewal_pipeline_customer_id_fkey(
        id, uid, name, phone, email, customer_type
      ),
      follow_up_tasks(id, status, due_date, task_type)
    `,
      { count: "exact" }
    );

  if (stage) query = query.eq("stage", stage);
  if (rm) query = query.eq("assigned_rm", rm);
  if (customer) query = query.eq("customer_id", customer);

  if (search) {
    // We'll filter in memory after fetch for joined fields
  }

  query = query
    .order(sort, { ascending: order })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let results = data ?? [];

  // Post-fetch filters on joined data
  if (policy_type) {
    results = results.filter((r: any) => r.policies?.policy_type === policy_type);
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (r: any) =>
        r.customers?.name?.toLowerCase().includes(q) ||
        r.policies?.policy_number?.toLowerCase().includes(q) ||
        r.policies?.insurer_name?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    data: results,
    total: count ?? 0,
    page,
    limit,
  });
}
