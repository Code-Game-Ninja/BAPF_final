import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api/error";
import { protect } from "@/lib/api/protect";
import { buildPatchUserSchema } from "@/lib/validations/settings";

// ── PUT /api/users/[id] ───────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: userId } = await params;

  // ── Fetch admin-configured password min-length ──
  let minPasswordLength = 6;
  try {
    const { data } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", "password_min_length")
      .maybeSingle();
    if (data?.value) {
      minPasswordLength = parseInt(String(data.value), 10) || 6;
    }
  } catch { /* use default */ }

  // ── Use centralized validation schema ──
  const patchSchema = buildPatchUserSchema(minPasswordLength);
  let body: any;

  try {
    const raw = await req.json();
    const result = patchSchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    body = result.data;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  try {
    // Update Supabase Auth user if needed
    const authUpdates: Record<string, unknown> = {};
    if (body.email) authUpdates.email = body.email;
    if (body.password) authUpdates.password = body.password;
    // Store branch_id in user_metadata
    const metadataUpdates: Record<string, unknown> = {};
    if (body.name) metadataUpdates.name = body.name;
    if (body.branch_id !== undefined) metadataUpdates.branch_id = body.branch_id;

    if (Object.keys(authUpdates).length > 0 || Object.keys(metadataUpdates).length > 0) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ...authUpdates,
        ...(Object.keys(metadataUpdates).length > 0 ? { user_metadata: metadataUpdates } : {}),
        ...(body.status === "inactive" ? { ban_duration: "876600h" } : {}),
        ...(body.status === "active" ? { ban_duration: "none" } : {}),
      });
      if (authErr) {
        console.error("[users PUT] Auth update error:", authErr);
        return errorResponse(authErr.message, 500);
      }
    }

    // Update database profile
    const now = new Date().toISOString();
    const dbUpdates: Record<string, unknown> = { updated_at: now };
    if (body.name !== undefined) dbUpdates.name = body.name;
    if (body.email !== undefined) dbUpdates.email = body.email;
    if (body.role !== undefined) dbUpdates.role = body.role;
    if (body.status !== undefined) dbUpdates.status = body.status;
    if (body.phone !== undefined) dbUpdates.phone = body.phone;
    if (body.branch_id !== undefined) dbUpdates.branch_id = body.branch_id;
    if (body.bio !== undefined) dbUpdates.bio = body.bio;

    const { error: dbError } = await supabaseAdmin
      .from("users")
      .update(dbUpdates)
      .eq("id", userId);

    if (dbError) {
      console.error("[users PUT] DB update error:", dbError);
      try {
        const { data: currentUser } = await supabaseAdmin
          .from("users")
          .select("name, email, status, branch_id")
          .eq("id", userId)
          .single();
        if (currentUser) {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            ...(body.email ? { email: currentUser.email } : {}),
            user_metadata: { name: currentUser.name, branch_id: currentUser.branch_id },
            ...(body.status ? (currentUser.status === "inactive" ? { ban_duration: "876600h" } : { ban_duration: "none" }) : {}),
          });
        }
      } catch (rollbackErr) {
        console.error("[users PUT] Auth rollback failed:", rollbackErr);
      }
      return errorResponse(dbError.message, 500);
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: unknown) {
    console.error("[users PUT]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/users/[id] ────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = protect(req, { maxRequests: 5, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin"]);
  if (isAuthError(caller)) return authError(caller);

  const { id: userId } = await params;

  if (caller.uid === userId) {
    return errorResponse("Cannot delete your own account", 400);
  }

  try {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error("[users DELETE] Auth delete error:", authErr);
      return errorResponse(authErr.message, 500);
    }

    const { error: dbError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbError) {
      console.error("[users DELETE] DB delete error:", dbError);
      return errorResponse("User deleted from auth but database cleanup failed", 500);
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: unknown) {
    console.error("[users DELETE]", err);
    return errorResponse("Internal server error", 500);
  }
}
