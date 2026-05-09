/**
 * Supabase Audit Log Service
 */

import { supabase } from "@/lib/supabase/client";
import { AuditAction } from "@/lib/types";

const TBL = "audit_logs";

export interface AuditLogPayload {
  action: AuditAction;
  module: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  target_id?: string;
  target_type?: string;
  details?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(payload: AuditLogPayload): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from(TBL).insert({
    ...payload,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
}

export async function getAuditLogsForModule(
  module: string,
  maxResults = 50
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from(TBL)
    .select("*")
    .eq("module", module)
    .order("created_at", { ascending: false })
    .limit(maxResults);
  if (error) throw error;
  return data ?? [];
}

export async function getAuditLogsByUser(
  userId: string,
  maxResults = 50
): Promise<import("@/lib/types").AuditLog[]> {
  const { data, error } = await supabase
    .from(TBL)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(maxResults);
  if (error) throw error;
  return (data ?? []) as import("@/lib/types").AuditLog[];
}

// Backward-compatible wrapper matching mock pattern
export const auditLogService = {
  async log(payload: AuditLogPayload): Promise<void> {
    return logAudit(payload);
  },
  async logAction(
    userId: string,
    userName: string,
    action: AuditAction,
    module: string,
    details?: string,
    userRole?: string
  ): Promise<void> {
    return logAudit({ action, module, user_id: userId, user_name: userName, user_role: userRole, details });
  },
  getByUser: getAuditLogsByUser,
  getStats: async () => {
    // Total count (head-only request)
    const { count: total, error: totalErr } = await supabase
      .from(TBL)
      .select("*", { count: "exact", head: true });
    if (totalErr) throw totalErr;

    // Today's count
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { count: todayCount, error: todayErr } = await supabase
      .from(TBL)
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso);
    if (todayErr) throw todayErr;

    // Fetch recent 500 for module/action breakdown (capped for performance)
    const { data: recent, error: recentErr } = await supabase
      .from(TBL)
      .select("module, action")
      .order("created_at", { ascending: false })
      .limit(500);
    if (recentErr) throw recentErr;

    const byModule: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    (recent ?? []).forEach((d) => {
      if (d.module) byModule[d.module] = (byModule[d.module] || 0) + 1;
      if (d.action) byAction[d.action] = (byAction[d.action] || 0) + 1;
    });
    return { total: total ?? 0, todayCount: todayCount ?? 0, byModule, byAction };
  },
};
