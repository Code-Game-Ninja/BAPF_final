import useSWR, { mutate } from "swr";
import { auditLogService } from "@/lib/services/audit-log.service";
import { AuditLog } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { useCollection } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

export function useAuditLogs(limit?: number) {
  const { user } = useAuth();
  return useCollection<AuditLog>(
    user ? "audit-logs" : null,
    "audit_logs",
    undefined,
    "createdAt",
    "desc",
    limit
  );
}

export function useAuditLogsByUser(userId: string | null) {
  return useCollection<AuditLog>(
    userId ? `audit-logs-user-${userId}` : null,
    "audit_logs",
    userId ? [{ field: "user_id", operator: "==", value: userId }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useAuditLogsByAction(action: string | null) {
  return useCollection<AuditLog>(
    action ? `audit-logs-action-${action}` : null,
    "audit_logs",
    action ? [{ field: "action", operator: "==", value: action }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useAuditLogsByModule(module: string | null) {
  return useCollection<AuditLog>(
    module ? `audit-logs-module-${module}` : null,
    "audit_logs",
    module ? [{ field: "module", operator: "==", value: module }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useAuditStats() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "audit-stats" : null,
    () => auditLogService.getStats(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "audit_logs");
  return swr;
}

export function invalidateAuditLogs() {
  mutate(
    (key: string) => typeof key === "string" && key.startsWith("audit-log"),
    undefined,
    { revalidate: true }
  );
}
