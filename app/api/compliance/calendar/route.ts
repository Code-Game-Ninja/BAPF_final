/**
 * GET /api/compliance/calendar
 * Returns compliance items for the next 90 days grouped by date.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const db = supabaseAdmin as any;

  const today = new Date();
  const in90Days = new Date(today);
  in90Days.setDate(in90Days.getDate() + 90);

  // Also include overdue items
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await db
    .from("compliance_items")
    .select("*")
    .gte("due_date", thirtyDaysAgo.toISOString().split("T")[0])
    .lte("due_date", in90Days.toISOString().split("T")[0])
    .neq("status", "completed")
    .order("due_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by date
  const grouped: Record<string, any[]> = {};
  for (const item of data ?? []) {
    const date = item.due_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  }

  return NextResponse.json({ grouped, items: data ?? [] });
}
