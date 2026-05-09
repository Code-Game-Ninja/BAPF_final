import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(req.url);

    let query = supabase.from("proposals").select("*").order("created_at", { ascending: false });

    const status = searchParams.get("status");
    const assigned_to = searchParams.get("assigned_to");
    const search = searchParams.get("search");

    if (status) query = query.eq("status", status);
    if (assigned_to) query = query.eq("assigned_to", assigned_to);
    if (search) query = query.or(`customer_name.ilike.%${search}%,proposal_number.ilike.%${search}%`);

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
    const { data, error } = await supabase.from("proposals").insert(body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
