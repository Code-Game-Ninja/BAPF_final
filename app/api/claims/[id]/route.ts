import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from("claims").select("*").eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();
    const body = await req.json();

    // If status change, add timeline entry
    if (body.status && body._userId) {
      const { data: current } = await supabase.from("claims").select("status").eq("id", id).single();
      if (current && current.status !== body.status) {
        await supabase.from("claim_timeline").insert({
          claim_id: id,
          action: "status_change",
          description: `Status changed from ${current.status} to ${body.status}`,
          old_value: current.status,
          new_value: body.status,
          performed_by: body._userId,
          performed_by_name: body._userName || "",
        });
      }
      delete body._userId;
      delete body._userName;
    }

    const { data, error } = await supabase.from("claims").update(body).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (_err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
