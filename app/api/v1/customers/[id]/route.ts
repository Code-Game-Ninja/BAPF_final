import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || token !== process.env.CRM_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch customer profile
    const { data: customer, error: custError } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (custError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // 2. Fetch active policies count
    const { count: policiesCount, error: countError } = await supabaseAdmin
      .from("policies")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("status", "active");

    if (countError) throw countError;

    // 3. Fetch latest renewal date (if any)
    const { data: lastRenewal, error: renError } = await supabaseAdmin
      .from("renewals")
      .select("renewed_date")
      .eq("customer_id", customerId)
      .not("renewed_date", "is", null)
      .order("renewed_date", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (renError) throw renError;

    // Map to portal's customer data structure
    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      activePoliciesCount: policiesCount || 0,
      lastRenewalDate: lastRenewal?.renewed_date || null
    });
  } catch (error) {
    console.error("[api/v1/customer_profile] Fail:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
