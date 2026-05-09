/**
 * Supabase User Service
 * Manages user profiles in the `users` table.
 * Auth user creation is handled via Admin SDK API routes.
 */

import { supabase } from "@/lib/supabase/client";
import { User, UserRole } from "@/lib/types";
import { getAccessToken } from "./auth.service";
import { toSnakePayload } from "@/lib/helpers/object-helpers";

const TABLE = "users";

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as User[];
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data as User) ?? null;
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("role", role)
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as User[];
}

export async function updateUser(id: string, data: Partial<User>): Promise<void> {
  const payload = toSnakePayload(data as Record<string, unknown>);
  payload.updated_at = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error("User not found");
}

export async function setUserStatus(
  uid: string,
  status: "active" | "inactive"
): Promise<void> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", uid)
    .select();
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) throw new Error("User not found");
}

export async function getUserCount(): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Assign/unassign employee to manager
export async function assignToManager(userId: string, managerId: string | null): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ mapped_manager_id: managerId, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

// Get employees by manager
export async function getEmployeesByManager(managerId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("mapped_manager_id", managerId)
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as User[];
}

// Get unassigned employees (no manager)
export async function getUnassignedEmployees(): Promise<User[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .is("mapped_manager_id", null)
    .in("role", ["employee", "manager"])
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as User[];
}

// Backward-compatible service wrapper
export const userService = {
  getAll: getAllUsers,
  getById: getUserById,
  getByUid: getUserById,
  update: updateUser,
  assignToManager,
  getEmployeesByManager,
  getUnassignedEmployees,
  /**
   * Update a user via the Admin SDK API route (PUT /api/users/[id]).
   */
  updateViaApi: async (
    userId: string,
    data: Partial<{
      name: string;
      role: "admin" | "manager" | "employee";
      phone: string;
      password: string;
      status: "active" | "inactive";
      email: string;
      branch_id: string;
      bio: string;
    }>
  ): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error ?? "Failed to update user");
    }
  },
  delete: async (id: string) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error ?? "Failed to delete user");
    }
  },
  count: getUserCount,
  getByRole: getUsersByRole,
  setStatus: setUserStatus,
  /**
   * Creates a full user via the Admin SDK API route.
   */
  create: async (data: Partial<User> & { name: string; email: string; password?: string }): Promise<User> => {
    if (data.password) {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role ?? "employee",
          phone: data.phone ?? undefined,
          branch_id: data.branch_id ?? undefined,
          bio: data.bio ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to create user");
      }

      const created = await res.json() as { uid: string; email: string; role: string };
      return { id: created.uid, uid: created.uid, name: data.name, email: created.email, role: created.role as User["role"], status: "active" } as User;
    }

    // Fallback: write profile only (no Auth account)
    const id = (data as { uid?: string }).uid || crypto.randomUUID();
    const payload = { ...data, id, status: data.status ?? "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await supabase.from(TABLE).insert(payload);
    if (error) throw new Error(error.message);
    return { ...payload } as unknown as User;
  },
};

// ── Bulk Import ──────────────────────────────────────────────────────────────

export interface BulkUserRow {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "employee";
  phone?: string;
}

export interface BulkUserImportResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

/**
 * Bulk-create users by calling POST /api/users for each row.
 * Supabase Auth doesn't support batch creation, so we create sequentially.
 * Skips duplicate emails (within file and existing conflicts).
 */
export async function bulkCreateUsers(
  rows: BulkUserRow[],
  onProgress?: (completed: number, total: number) => void
): Promise<BulkUserImportResult> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Use let so we can refresh token during bulk import
  let currentToken: string | null = token;

  const result: BulkUserImportResult = { created: 0, skipped: 0, errors: [] };

  // Deduplicate by email within file
  const seenEmails = new Set<string>();
  const validRows: (BulkUserRow & { _rowIndex: number })[] = [];
  for (let i = 0; i < rows.length; i++) {
    const email = rows[i].email.toLowerCase().trim();
    if (seenEmails.has(email)) {
      result.errors.push({ row: i + 1, reason: `Duplicate email in file: ${email}` });
      result.skipped++;
      continue;
    }
    seenEmails.add(email);
    validRows.push({ ...rows[i], _rowIndex: i + 1 });
  }

  // Create each user via Admin SDK API
  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    try {
      // Refresh token every 50 rows to avoid expiry
      if (i > 0 && i % 50 === 0) {
        const refreshed = await getAccessToken();
        if (refreshed) currentToken = refreshed;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({
          name: row.name,
          email: row.email.toLowerCase().trim(),
          password: row.password,
          role: row.role,
          phone: row.phone || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        const reason = err.error || `HTTP ${res.status}`;
        if (res.status === 409) {
          result.errors.push({ row: row._rowIndex, reason: `Email already exists: ${row.email}` });
          result.skipped++;
        } else {
          result.errors.push({ row: row._rowIndex, reason });
          result.skipped++;
        }
      } else {
        result.created++;
      }
    } catch (err) {
      result.errors.push({ row: row._rowIndex, reason: err instanceof Error ? err.message : "Network error" });
      result.skipped++;
    }
    onProgress?.(i + 1, validRows.length);
  }

  return result;
}
