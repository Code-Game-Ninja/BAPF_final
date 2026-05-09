/**
 * PUT /api/customers/[id]/update
 *
 * Secure server-side customer update endpoint.
 * Specifically built to intercept email changes and synchronize them to:
 * 1. Supabase Auth (auth.users)
 * 2. customer_portal_users
 * 3. Dispatch transactional Old & New email alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { emailService } from "@/lib/services/email.service";
import { errorResponse } from "@/lib/api/error";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: customerId } = await params;
  if (!customerId) return NextResponse.json({ error: "Missing customer ID" }, { status: 400 });

  try {
    const body = await req.json();
    
    // 1. Get original customer to detect email change
    const { data: oldCustomer, error: fetchError } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (fetchError || !oldCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const emailChanged = oldCustomer.email !== body.email;

    // 2. Update customer record
    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update({
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        pincode: body.pincode || null,
      })
      .eq("id", customerId);

    if (updateError) throw updateError;

    // 3. Handle Email Change Side Effects
    if (emailChanged && body.email) {
      // Find Portal user
      const { data: portalUsers } = await supabaseAdmin
        .from("customer_portal_users")
        .select("*")
        .eq("customer_id", customerId);

      const portalUser = portalUsers?.[0];

      if (portalUser?.auth_user_id) {
        // Sync Auth Email
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          portalUser.auth_user_id,
          { email: body.email, user_metadata: { email: body.email, name: body.name } }
        );
        if (authError) console.error("[Customer Update API] Failed to update auth email:", authError);

        // Sync Customer Portal Users table
        await supabaseAdmin
          .from("customer_portal_users")
          .update({ email: body.email })
          .eq("id", portalUser.id);
          
        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.bapf.in";

        // Dispatch emails
        if (oldCustomer.email) {
          await emailService.sendEmailChangedOld(oldCustomer.email, {
            customerName: body.name,
            oldEmail: oldCustomer.email,
            newEmail: body.email,
          }).catch(console.error);
        }
        
        await emailService.sendEmailChangedNew(body.email, {
          customerName: body.name,
          newEmail: body.email,
          portalUrl,
        }).catch(console.error);
        
        // Log communication
        try {
          await supabaseAdmin.from("communication_logs").insert({
            customer_id: customerId,
            type: "email",
            status: "sent",
            subject: "Security Alert: Your Login ID has been Changed",
            recipient: `${oldCustomer.email}, ${body.email}`,
            sender: caller.uid,
            content: "System email addressing login configuration changes.",
          });
        } catch (logErr) {
          console.error("[Customer Update API] Failed to log communication:", logErr);
        }
      }
    }

    return NextResponse.json({ success: true, emailChanged });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
