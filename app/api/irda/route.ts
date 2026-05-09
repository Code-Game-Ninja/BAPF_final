import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(req.url);
    const report = searchParams.get("report");
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const insurer = searchParams.get("insurer") || undefined;

    let data: unknown[] = [];

    switch (report) {
      case "policy_register": {
        let q = supabase.from("policies").select("policy_number, policy_type, customer_name, insurer_name, start_date, end_date, premium_amount, sum_insured, status, assigned_to_name, business_type, created_at");
        if (from) q = q.gte("start_date", from);
        if (to) q = q.lte("start_date", to);
        if (insurer) q = q.eq("insurer_name", insurer);
        const res = await q.order("start_date", { ascending: false });
        data = res.data ?? [];
        break;
      }
      case "premium_register": {
        let q = supabase.from("premiums").select("policy_number, customer_name, amount, period, due_date, status, collected_date, created_at");
        if (from) q = q.gte("due_date", from);
        if (to) q = q.lte("due_date", to);
        const res = await q.order("due_date", { ascending: false });
        data = res.data ?? [];
        break;
      }
      case "claim_register": {
        let q = supabase.from("claims").select("claim_number, policy_number, customer_name, claim_type, claim_amount, settled_amount, status, claim_date, incident_date, insurer_name, settlement_date");
        if (from) q = q.gte("claim_date", from);
        if (to) q = q.lte("claim_date", to);
        const res = await q.order("claim_date", { ascending: false });
        data = res.data ?? [];
        break;
      }
      case "commission_disclosure": {
        let q = supabase.from("commissions").select("policy_number, user_name, amount, status, paid_date, created_at");
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", to);
        const res = await q.order("created_at", { ascending: false });
        data = res.data ?? [];
        break;
      }
      case "summary": {
        const [pol, prem, clm, comm] = await Promise.all([
          supabase.from("policies").select("status, premium_amount, policy_type"),
          supabase.from("premiums").select("status, amount"),
          supabase.from("claims").select("status, claim_amount, settled_amount"),
          supabase.from("commissions").select("status, amount"),
        ]);
        data = [{
          totalPolicies: (pol.data ?? []).length,
          activePolicies: (pol.data ?? []).filter((p: Record<string, string>) => p.status === "active").length,
          totalClaims: (clm.data ?? []).length,
          totalCommissions: (comm.data ?? []).reduce((s: number, c: Record<string, number>) => s + (c.amount || 0), 0),
        }];
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // If CSV export requested
    if (searchParams.get("format") === "csv" && Array.isArray(data) && data.length > 0) {
      const records = data as Record<string, unknown>[];
      const headers = Object.keys(records[0]);
      const csv = [
        headers.join(","),
        ...records.map(row => headers.map(h => {
          const val = row[h];
          const s = val === null || val === undefined ? "" : String(val);
          return s.includes(",") ? `"${s}"` : s;
        }).join(","))
      ].join("\n");
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${report}.csv` },
      });
    }

    return NextResponse.json(data);
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
