/**
 * Forbidden Attempt Logger
 *
 * Logs unauthorized access attempts to the audit_logs table.
 * Call from API routes or client-side guards when access is denied.
 */

import { auditLogService } from "@/lib/services/audit-log.service";
import type { AuditAction } from "@/lib/types";

interface ForbiddenAttemptParams {
  userId?: string;
  userName?: string;
  action: AuditAction;
  module: string;
  details: string;
  ipAddress?: string;
}

/**
 * Log a forbidden access attempt to audit logs.
 */
export async function logForbiddenAttempt(
  params: ForbiddenAttemptParams
): Promise<void> {
  try {
    await auditLogService.logAction(
      params.userId || "anonymous",
      params.userName || "Unknown",
      params.action,
      params.module,
      `[FORBIDDEN] ${params.details}`
    );
  } catch (err) {
    // Don't let logging failures break the app
    console.error("[ForbiddenLogger] Failed to log attempt:", err);
  }
}

/**
 * Log an IP-restricted access attempt.
 */
export async function logIpRestriction(
  ip: string,
  path: string
): Promise<void> {
  return logForbiddenAttempt({
    action: "ip_blocked",
    module: "security",
    details: `IP ${ip} attempted to access ${path}`,
    ipAddress: ip,
  });
}

/**
 * Log a role-based access denied event.
 */
export async function logRoleDenied(
  userId: string,
  role: string,
  requiredRole: string,
  path: string
): Promise<void> {
  return logForbiddenAttempt({
    userId,
    action: "role_denied",
    module: "security",
    details: `User (${role}) tried to access ${path} (requires ${requiredRole})`,
  });
}

/**
 * Log a rate-limit exceeded event.
 */
export async function logRateLimitExceeded(
  ip: string,
  path: string
): Promise<void> {
  return logForbiddenAttempt({
    action: "rate_limited",
    module: "security",
    details: `IP ${ip} exceeded rate limit on ${path}`,
    ipAddress: ip,
  });
}
