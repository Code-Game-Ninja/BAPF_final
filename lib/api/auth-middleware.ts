/**
 * lib/api/auth-middleware.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared server-side auth helper for all Next.js API routes.
 * Verifies the Supabase JWT from the Authorization header and returns
 * the decoded claims (uid, role, branch_id).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface CallerClaims {
  uid: string;
  email: string;
  role: UserRole;
  branch_id?: string;
  name?: string;
}

type AuthError = { error: string; status: 401 | 403 };

/**
 * Extract + verify the Bearer token from the request.
 * Returns CallerClaims on success, AuthError on failure.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<CallerClaims | AuthError> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return { error: "Unauthorized — missing Bearer token", status: 401 };
  }

  const admin = createAdminClient();

  // Verify the JWT and get user data
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user) {
    return { error: "Unauthorized — invalid or expired token", status: 401 };
  }

  // Get the user's profile to check role and branch_id
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role, branch_id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Unauthorized — user profile not found", status: 401 };
  }

  const role = (profile.role ?? "") as UserRole;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      error: `Forbidden — requires role: ${allowedRoles.join(" or ")}`,
      status: 403,
    };
  }

  return {
    uid: user.id,
    email: user.email ?? "",
    role,
    branch_id: profile?.branch_id ?? undefined,
    name: profile?.name as string | undefined,
  };
}

/** Convenience: return a 401/403 NextResponse from an AuthError. */
export function authError(err: AuthError): NextResponse {
  return NextResponse.json({ error: err.error }, { status: err.status });
}

/** Type-guard: check if requireAuth returned an error. */
export function isAuthError(v: CallerClaims | AuthError): v is AuthError {
  return "error" in v;
}
