/**
 * GET /api/irda-reports/[id]/download
 * Download IRDA report — redirects to file URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data: report, error } = await db
    .from("irda_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // If file_url is a data URL (base64), return it directly as a download
  if (report.file_url?.startsWith("data:")) {
    const base64Data = report.file_url.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${report.file_path}"`,
      },
    });
  }

  // Otherwise redirect to the storage URL
  return NextResponse.redirect(report.file_url);
}
