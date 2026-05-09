import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await req.json();

    // Handle bulk renewal reminders
    if (body.action === "renewal_reminders") {
      const { data: renewals } = await supabase
        .from("policies")
        .select("id, policy_number, customer_name, customer_id, end_date, premium_amount")
        .gte("end_date", new Date().toISOString().split("T")[0])
        .lte("end_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .eq("status", "active");

      const sent = (renewals ?? []).length;
      // Log each communication
      for (const policy of renewals ?? []) {
        await supabase.from("communication_logs").insert({
          customer_id: policy.customer_id,
          customer_name: policy.customer_name,
          policy_id: policy.id,
          channel: "email",
          recipient: policy.customer_name,
          subject: `Policy Renewal Reminder - ${policy.policy_number}`,
          body: `Your policy ${policy.policy_number} expires on ${policy.end_date}. Please renew.`,
          status: "sent",
          sent_at: new Date().toISOString(),
          created_by: body.userId,
        });
      }

      return NextResponse.json({ success: true, sent });
    }

    // Handle single email send
    const { channel, recipient, subject, body: emailBody, customerId, customerName, templateId } = body;

    // For now, log the communication (actual SMTP/WhatsApp integration can be added later)
    await supabase.from("communication_logs").insert({
      template_id: templateId,
      customer_id: customerId,
      customer_name: customerName,
      channel: channel || "email",
      recipient,
      subject,
      body: emailBody,
      status: "sent",
      sent_at: new Date().toISOString(),
      created_by: body.userId,
    });

    return NextResponse.json({ success: true });
  } catch (_err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
