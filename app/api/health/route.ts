/**
 * GET /api/health
 * ─────────────────────────────────────────────────────────────────────────────
 * Health check endpoint for monitoring and load-balancer probes.
 * Returns 200 with basic status info if the server is running.
 * Optionally checks Supabase connectivity.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  let supabaseOk = false;
  try {
    // Lazy-import to avoid cold-start overhead if DB is unreachable
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    const { error } = await supabaseAdmin
      .from("system_config")
      .select("key")
      .limit(1);
    supabaseOk = !error;
  } catch {
    supabaseOk = false;
  }

  const latencyMs = Date.now() - start;

  const status = supabaseOk ? "healthy" : "degraded";
  const httpStatus = supabaseOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      latencyMs,
      checks: {
        supabase: supabaseOk ? "ok" : "unreachable",
      },
    },
    { status: httpStatus }
  );
}
