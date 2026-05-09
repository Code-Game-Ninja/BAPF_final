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
    // 1. Fetch documents directly linked to the customer
    const { data: docs, error: docError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (docError) throw docError;

    // 2. Fetch policies to get policy PDFs (if not already redundant)
    const { data: policies, error: polError } = await supabaseAdmin
      .from("policies")
      .select("id, policy_number, policy_type, pdf_url, end_date")
      .eq("customer_id", customerId)
      .not("pdf_url", "is", null);

    if (polError) throw polError;

    // Map direct documents
    const mappedDocs = (docs || []).map(d => ({
      id: d.id,
      name: d.file_name,
      category: d.document_type || "Other",
      downloadUrl: d.file_url,
      metadata: {
        fileSize: d.file_size,
        policyId: d.policy_id
      }
    }));

    // Map policy PDFs as documents
    const mappedPolicyDocs = (policies || []).map(p => ({
      id: `p-${p.id}`,
      name: `Policy PDF: ${p.policy_number}`,
      category: "Policy",
      expiryDate: p.end_date,
      downloadUrl: p.pdf_url,
      metadata: {
        policyId: p.id,
        policyType: p.policy_type
      }
    }));

    // Combine and return
    return NextResponse.json([...mappedPolicyDocs, ...mappedDocs]);
  } catch (error) {
    console.error("[api/v1/documents] Fail:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
