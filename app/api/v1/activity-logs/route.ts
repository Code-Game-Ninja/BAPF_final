import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || token !== process.env.CRM_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { customerId, activity, details, timestamp, source } = await req.json();

    if (!customerId || !activity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Since audit_logs expects a user_id, but this is a portal user activity,
    // we'll record it as a customer portal activity.
    // For now, let's log it into the audit_logs or a dedicated activity table.
    // Let's use audit_logs with a special module name.

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000001", // Default System Admin
      user_name: "Customer Portal (System)",
      user_role: "admin",
      action: "update",
      module: "customer_portal",
      details: `Activity from Portal: ${activity}`,
      target_id: customerId,
      target_type: "customer",
      metadata: { ...details, source, portal_timestamp: timestamp },
      created_at: timestamp || new Date().toISOString()
    });

    if (auditError) throw auditError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/v1/activity_logs] Fail:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
