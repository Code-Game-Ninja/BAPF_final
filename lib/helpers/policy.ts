import { Policy } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

// ---- Expiry Bucket Types ----

export type ExpiryBucket =
  | "expired"
  | "next7days"
  | "next30days"
  | "next90days"
  | "beyond90days";

export interface ExpiryBucketInfo {
  key: ExpiryBucket;
  label: string;
  description: string;
  color: string;
  badgeVariant: "destructive" | "default" | "secondary" | "outline";
}

export const EXPIRY_BUCKETS: ExpiryBucketInfo[] = [
  {
    key: "expired",
    label: "Expired",
    description: "Policies past their end date",
    color: "#ef4444",
    badgeVariant: "destructive",
  },
  {
    key: "next7days",
    label: "Next 7 Days",
    description: "Expiring within 7 days",
    color: "#f97316",
    badgeVariant: "destructive",
  },
  {
    key: "next30days",
    label: "Next 30 Days",
    description: "Expiring within 30 days",
    color: "#eab308",
    badgeVariant: "default",
  },
  {
    key: "next90days",
    label: "Next 90 Days",
    description: "Expiring within 90 days",
    color: "#3b82f6",
    badgeVariant: "secondary",
  },
  {
    key: "beyond90days",
    label: "Beyond 90 Days",
    description: "Expiring after 90 days",
    color: "#22c55e",
    badgeVariant: "outline",
  },
];

// ---- Helpers ----

/**
 * Convert a Date or ISO string to a JS Date.
 */
function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * Get the number of days until a policy expires (negative = already expired).
 */
export function getDaysUntilExpiry(endDate: Date | string): number {
  const end = toDate(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Determine which expiry bucket a policy falls into.
 */
export function getPolicyExpiryBucket(endDate: Date | string): ExpiryBucket {
  const days = getDaysUntilExpiry(endDate);
  if (days < 0) return "expired";
  if (days <= 7) return "next7days";
  if (days <= 30) return "next30days";
  if (days <= 90) return "next90days";
  return "beyond90days";
}

/**
 * Get the bucket info for a policy's expiry.
 */
export function getPolicyExpiryBucketInfo(
  endDate: Date | string
): ExpiryBucketInfo {
  const bucket = getPolicyExpiryBucket(endDate);
  return EXPIRY_BUCKETS.find((b) => b.key === bucket)!;
}

/**
 * Group an array of policies by their expiry bucket.
 */
export function groupPoliciesByExpiryBucket(
  policies: Policy[]
): Record<ExpiryBucket, Policy[]> {
  const groups: Record<ExpiryBucket, Policy[]> = {
    expired: [],
    next7days: [],
    next30days: [],
    next90days: [],
    beyond90days: [],
  };

  for (const policy of policies) {
    if (policy.status === "archived") continue;
    const bucket = getPolicyExpiryBucket(policy.end_date);
    groups[bucket].push(policy);
  }

  return groups;
}

/**
 * Get counts per expiry bucket.
 */
export function getExpiryBucketCounts(
  policies: Policy[]
): Record<ExpiryBucket, number> {
  const groups = groupPoliciesByExpiryBucket(policies);
  return {
    expired: groups.expired.length,
    next7days: groups.next7days.length,
    next30days: groups.next30days.length,
    next90days: groups.next90days.length,
    beyond90days: groups.beyond90days.length,
  };
}

// ---- ISO Week Helpers ----

/**
 * Get ISO week number for a date.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the start (Monday) and end (Sunday) of an ISO week.
 */
export function getISOWeekRange(
  year: number,
  weekNumber: number
): { start: Date; end: Date } {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // ISO: Monday=1..Sunday=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { start: monday, end: sunday };
}

/**
 * Group policies by day of the week for a given ISO week.
 */
export function groupPoliciesByWeekday(
  policies: Policy[],
  year: number,
  weekNumber: number
): { day: string; date: Date; policies: Policy[]; totalPremium: number }[] {
  const { start } = getISOWeekRange(year, weekNumber);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return days.map((dayName, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dayPolicies = policies.filter((p) => {
      const endDate = toDate(p.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === date.getTime();
    });

    const totalPremium = dayPolicies.reduce((sum, p) => sum + (p.premium_amount || 0), 0);

    return { day: dayName, date, policies: dayPolicies, totalPremium };
  });
}

/**
 * Filter policies expiring within a given ISO week.
 */
export function getPoliciesExpiringInWeek(
  policies: Policy[],
  year: number,
  weekNumber: number
): Policy[] {
  const { start, end } = getISOWeekRange(year, weekNumber);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return policies.filter((p) => {
    if (p.status === "archived") return false;
    const endDate = toDate(p.end_date);
    return endDate >= start && endDate <= end;
  });
}

/**
 * Format a policy for CSV/Excel export.
 */
export function formatPolicyForExport(policy: Policy): Record<string, string> {
  const endDate = toDate(policy.end_date);
  const startDate = toDate(policy.start_date);
  const daysUntil = getDaysUntilExpiry(policy.end_date);

  return {
    "Policy Number": policy.policy_number,
    "Policy Type": policy.policy_type,
    "Customer": policy.customer_name,
    "Insurer": policy.insurer_name || "-",
    "Start Date": startDate.toLocaleDateString("en-IN"),
    "End Date": endDate.toLocaleDateString("en-IN"),
    "Premium": formatCurrency(policy.premium_amount || 0),
    "Sum Insured": policy.sum_insured ? formatCurrency(policy.sum_insured) : "-",
    "Status": policy.status,
    "Days Until Expiry": daysUntil.toString(),
    "Expiry Bucket": getPolicyExpiryBucket(policy.end_date),
    "Assigned To": policy.assigned_to_name || "-",
  };
}
