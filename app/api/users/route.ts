import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api/error";
import { protect } from "@/lib/api/protect";
import { buildCreateUserSchema } from "@/lib/validations/settings";

// ── POST /api/users ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 5, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // ── Server-side password length enforcement from admin settings ──
  let minPasswordLength = 6; // default fallback
  try {
    const { data } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", "password_min_length")
      .maybeSingle();
    if (data?.value) {
      minPasswordLength = parseInt(String(data.value), 10) || 6;
    }
  } catch {
    // If settings can't be read, use default
  }

  // ── Zod schema validation (runtime-safe role enum + all fields) ──
  const schema = buildCreateUserSchema(minPasswordLength);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, email, password, role, phone, branch_id } = parsed.data;
  const rawBody = body as Record<string, unknown>;
  const bio = typeof rawBody.bio === "string" ? rawBody.bio : undefined;

  // Read default_branch from settings as fallback when no branch_id provided
  let effectiveBranchId = branch_id ?? null;
  if (!effectiveBranchId) {
    try {
      const { data } = await supabaseAdmin
        .from("system_config")
        .select("value")
        .eq("key", "default_branch")
        .maybeSingle();
      if (data?.value) {
        const val = String(data.value).trim();
        // Only use if it looks like a UUID (branches.id is UUID)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
          effectiveBranchId = val;
        }
      }
    } catch { /* ignore */ }
  }

  try {
    // 1. Create the Supabase Auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role,
        branch_id: effectiveBranchId,
      },
    });

    if (authErr || !authData.user) {
      console.error("[users POST] Auth error:", authErr);
      if (authErr?.status === 422 || authErr?.message?.includes("already been registered")) {
        return errorResponse("Email already in use", 409);
      }
      return errorResponse(authErr?.message || "Failed to create user", 500);
    }

    const userId = authData.user.id;

    // 2. Write database profile (id = Auth UID)
    const now = new Date().toISOString();
    const profile = {
      id: userId,
      name,
      email,
      role,
      status: "active",
      phone: phone ?? null,
      branch_id: effectiveBranchId,
      bio: bio ?? null,
      created_at: now,
      updated_at: now,
    };

    const { error: profileError } = await supabaseAdmin
      .from("users")
      .insert(profile);

    if (profileError) {
      console.error("[users POST] Profile insert error:", profileError);
      // Try to clean up the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (cleanupErr) {
        console.error("[users POST] Auth user cleanup failed:", cleanupErr);
      }
      return errorResponse("Failed to create user profile", 500);
    }

    return NextResponse.json(
      { uid: userId, email, role },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[users POST]", err);
    return errorResponse("Internal server error", 500);
  }
}
