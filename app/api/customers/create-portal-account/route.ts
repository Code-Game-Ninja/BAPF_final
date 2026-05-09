/**
 * POST /api/customers/create-portal-account
 *
 * After creating a customer in database, call this to:
 * 1. Create a Supabase Auth user (role=customer)
 * 2. Store mapping in `customer_portal_users`
 * 3. Return credentials to admin/manager (no email sent)
 *
 * Body: { customerId, name, email, phone? }
 * Auth: Admin only
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import crypto from "crypto";

// ── Password generator ────────────────────────────────────────────────────────

function generatePassword(length = 10): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$!";
  const all = upper + lower + digits + symbols;

  let password = "";
  password += upper[crypto.randomInt(upper.length)];
  password += lower[crypto.randomInt(lower.length)];
  password += digits[crypto.randomInt(digits.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Fisher-Yates shuffle for unbiased randomization
  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 5, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) {
    return authError(caller);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { customerId, name, email, phone } = body as {
    customerId: string;
    name: string;
    email: string;
    phone?: string;
  };

  // ---- Validation ----
  if (!customerId || !email) {
    return NextResponse.json(
      { error: "customerId and email are required" },
      { status: 400 }
    );
  }

  // Security: Handle masked data from frontend (e.g. "bpa***mf@***il.***")
  // Use the privileged service_role client (supabaseAdmin) to fetch the actual unmasked
  // data from the DB using the customerId. We still trust the frontend's name/phone
  // for other metadata if they don't contain masks.
  let actualEmail = email;
  let actualPhone = phone || "";

  if (email.includes("*") || (phone && phone.includes("*"))) {
    console.log(`[create-portal-account] Detected masked data for customer ${customerId}. Fetching unmasked values...`);
    const { data: customer, error: fetchError } = await supabaseAdmin
      .from("customers")
      .select("email, phone")
      .eq("id", customerId)
      .single();

    if (fetchError || !customer) {
      console.error("[create-portal-account] Failed to fetch unmasked customer data:", fetchError);
      return NextResponse.json(
        { error: "Failed to verify customer data before account creation" },
        { status: 400 }
      );
    }

    if (email.includes("*")) {
      actualEmail = customer.email;
    }
    if (phone && phone.includes("*")) {
      actualPhone = customer.phone;
    }
  }

  try {
    // Check if portal account already exists
    const { data: existingPortal } = await supabaseAdmin
      .from("customer_portal_users")
      .select("id")
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (existingPortal) {
      return NextResponse.json(
        { message: "Portal account already exists", existing: true },
        { status: 200 }
      );
    }

    // Generate password
    const plainPassword = generatePassword(10);

    // Create or update Supabase Auth user
    let authUserId: string;
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: actualEmail as string,
      password: plainPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: "customer",
      },
    });

    if (createError) {
      // Check if user already exists
      if (createError.message?.includes("already been registered")) {
        // Find existing user by email — single page lookup (sufficient for most instances)
        let existing: { id: string; email?: string; user_metadata?: Record<string, unknown> } | undefined;
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        existing = listData?.users?.find((u) => u.email === actualEmail);

        if (!existing) {
          return NextResponse.json(
            { error: "Email already in use but could not find existing user" },
            { status: 409 }
          );
        }

        // Safety check: never hijack an internal staff account
        if (existing.user_metadata?.role && existing.user_metadata.role !== "customer") {
          return NextResponse.json(
            { error: "This email belongs to a staff account and cannot be used for a customer portal" },
            { status: 409 }
          );
        }

        authUserId = existing.id;

        // Update password for existing user
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: plainPassword,
          user_metadata: { name, role: "customer" },
        });
      } else {
        throw createError;
      }
    } else {
      authUserId = createData.user.id;
    }

    const now = new Date().toISOString();

    // Store in database (including password for admin/manager viewing in credentials page)
    const { error: insertError } = await supabaseAdmin
      .from("customer_portal_users")
      .insert({
        customer_id: customerId,
        auth_user_id: authUserId,
        name,
        email: actualEmail,
        phone: actualPhone,
        portal_password: plainPassword,
        is_active: true,
        first_login: false,
        created_at: now,
        updated_at: now,
        created_by: caller.uid,
      });

    if (insertError) {
      console.error("[create-portal-account] DB insert failed, rolling back auth user:", insertError);
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch (rollbackErr) {
        console.error("[create-portal-account] Auth user rollback failed:", rollbackErr);
      }
      return NextResponse.json({ error: "Failed to create portal user record" }, { status: 500 });
    }

    // Proactively update the main customer table with the email used (especially if it was corrected)
    await supabaseAdmin
      .from("customers")
      .update({ email: actualEmail, updated_at: now })
      .eq("id", customerId);

    return NextResponse.json({
      success: true,
      auth_user_id: authUserId,
      portal_email: actualEmail,
      message: "Portal account created successfully.",
    });
  } catch (err: unknown) {
    console.error("[create-portal-account] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
