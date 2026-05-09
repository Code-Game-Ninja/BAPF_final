import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(req.url);
    let query = supabase.from("invoices").select("*").order("created_at", { ascending: false });
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`customer_name.ilike.%${search}%,invoice_number.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();
    const { items, ...invoiceData } = body;
    const { data, error } = await supabase.from("invoices").insert(invoiceData).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (items?.length) {
      const itemsWithId = items.map((item: Record<string, unknown>) => ({ ...item, invoice_id: data.id }));
      await supabase.from("invoice_items").insert(itemsWithId);
    }
    return NextResponse.json(data, { status: 201 });
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
