/**
 * GET /api/policies/stats/categories
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns real-time policy counts by category (active/pending) for the intake page.
 * Used by CategorySelection component to display live stats.
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api/auth-middleware";
import { getPolicyStatsByCategory } from "@/lib/services/policy.service";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) {
    return NextResponse.json({ error: caller.error }, { status: caller.status });
  }

  try {
    const stats = await getPolicyStatsByCategory();
    return NextResponse.json(stats, { status: 200 });
  } catch (err: unknown) {
    console.error("[policies/stats/categories] Failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch policy category stats" },
      { status: 500 }
    );
  }
}
