/**
 * Supabase Dashboard Service
 */

import { supabase } from "@/lib/supabase/client";
import { Renewal, Premium, Customer, ValidityRegistry } from "@/lib/types";
import { validityService } from "./validity.service";

export async function getDashboardStats(role?: string | null) {
  try {
    return await _getDashboardStatsInner(role);
  } catch (err) {
    console.warn("[dashboard] getStats failed:", err);
    return {
      totalPolicies: 0, activePolicies: 0, totalCustomers: 0, activeLeads: 0, totalPremiums: 0,
      collectedPremiums: 0, pendingRenewals: 0, totalCommissions: 0,
      expiringThisWeek: 0, presentToday: 0, onLeaveToday: 0,
      totalCommissionEarned: 0, premiumOverdue: 0, amountCollected: 0,
      amountPending: 0, overdueRenewals: 0,
      pendingClaims: 0, pendingTickets: 0, missingDocs: 0,
    };
  }
}

async function _getDashboardStatsInner(role?: string | null) {
  const nowIso = new Date().toISOString();
  const today = new Date().toISOString().split("T")[0];
  const weekAheadIso = new Date(Date.now() + 7 * 86400000).toISOString();
  const isPrivileged = role === "admin" || role === "manager";

  // Base queries available to all authenticated roles
  const baseCounts = await Promise.all([
    supabase.from("policies").select("*", { count: "exact", head: true }),
    supabase.from("policies").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("renewals").select("*", { count: "exact", head: true }).in("status", ["due", "contacted"]),
    supabase.from("policies").select("*", { count: "exact", head: true })
      .eq("status", "active").gte("end_date", nowIso).lte("end_date", weekAheadIso),
    supabase.from("sales_leads").select("*", { count: "exact", head: true })
      .is("deleted_at", null).not("status", "in", '("converted","lost")'),
    supabase.from("claims").select("*", { count: "exact", head: true })
      .not("status", "in", '("settled","rejected","closed")'),
    supabase.from("service_tickets").select("*", { count: "exact", head: true })
      .not("status", "in", '("resolved","closed")'),
    supabase.from("documents").select("*", { count: "exact", head: true })
      .is("file_url", null),
  ]);

  const [
    totalPolicies, 
    activePolicies, 
    totalCustomers, 
    pendingRenewals, 
    expiringThisWeek, 
    activeLeadsRes,
    pendingClaimsRes,
    pendingTicketsRes,
    missingDocsRes
  ] = baseCounts;

  let collectedAmount = 0;
  let pendingAmount = 0;
  let premiumOverdueCount = 0;
  let presentToday = 0;
  let onLeaveToday = 0;
  let totalCommissions = 0;
  let totalCommissionEarned = 0;
  let overdueRenewalCount = 0;

  if (isPrivileged) {
    const [
      collectedRes,
      pendingRes,
      overdueRes,
      presentRes,
      leaveRes,
      paidCommRes,
      allCommRes,
      overdueRenRes,
    ] = await Promise.all([
      supabase.from("premiums").select("amount").eq("status", "collected"),
      supabase.from("premiums").select("amount").eq("status", "pending"),
      supabase.from("premiums").select("*", { count: "exact", head: true }).eq("status", "overdue"),
      supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today).in("status", ["present", "late", "half-day"]),
      supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today).eq("status", "leave"),
      supabase.from("commissions").select("amount").eq("status", "paid"),
      supabase.from("commissions").select("amount"),
      supabase.from("renewals").select("*", { count: "exact", head: true }).in("status", ["due", "contacted"]).lte("due_date", nowIso),
    ]);

    collectedAmount = (collectedRes.data ?? []).reduce((s, d) => s + ((d.amount as number) || 0), 0);
    pendingAmount   = (pendingRes.data ?? []).reduce((s, d) => s + ((d.amount as number) || 0), 0);
    premiumOverdueCount = overdueRes.count ?? 0;
    presentToday    = presentRes.count ?? 0;
    onLeaveToday    = leaveRes.count ?? 0;
    totalCommissions      = (allCommRes.data ?? []).reduce((s, d) => s + ((d.amount as number) || 0), 0);
    totalCommissionEarned = (paidCommRes.data ?? []).reduce((s, d) => s + ((d.amount as number) || 0), 0);
    overdueRenewalCount   = overdueRenRes.count ?? 0;
  }

  return {
    totalPolicies: totalPolicies.count ?? 0,
    activePolicies: activePolicies.count ?? 0,
    totalCustomers: totalCustomers.count ?? 0,
    activeLeads: activeLeadsRes.count ?? 0,
    totalPremiums: collectedAmount + pendingAmount,
    collectedPremiums: collectedAmount,
    pendingRenewals: pendingRenewals.count ?? 0,
    totalCommissions,
    expiringThisWeek: expiringThisWeek.count ?? 0,
    presentToday,
    onLeaveToday,
    totalCommissionEarned,
    premiumOverdue: premiumOverdueCount,
    amountCollected: collectedAmount,
    amountPending: pendingAmount,
    overdueRenewals: overdueRenewalCount,
    pendingClaims: pendingClaimsRes.count ?? 0,
    pendingTickets: pendingTicketsRes.count ?? 0,
    missingDocs: missingDocsRes.count ?? 0,
  };
}

export async function getRecentActivity(maxResults = 10, role?: string | null, userId?: string | null) {
  try {
    let query = supabase
      .from("audit_logs")
      .select("id, action, module, user_name, user_id, user_role, details, created_at")
      .order("created_at", { ascending: false })
      .limit(maxResults);

    // Role-based filtering:
    if (role === "employee" && userId) {
      query = query.eq("user_id", userId);
    } else if (role === "manager" && userId) {
      query = query.or(`user_id.eq.${userId},user_role.eq.employee`);
    } else if (role === "admin" && userId) {
      query = query.or(`user_id.eq.${userId},user_role.in.(employee,manager)`);
    } else {
      return [];
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((d) => {
      const pastTense: Record<string, string> = {
        create: "created",
        update: "updated",
        delete: "deleted",
        login: "logged into",
        logout: "logged out of",
      };
      const actionText = pastTense[d.action as string] ?? d.action;
      return {
        id: d.id,
        icon:
          d.action === "create"
            ? "plus"
            : d.action === "update"
            ? "pencil"
            : d.action === "delete"
            ? "trash"
            : "info",
        title: `${d.user_name} ${actionText} ${d.module}`,
        description: d.details,
        timestamp: d.created_at ? new Date(d.created_at as string) : new Date(),
      };
    });
  } catch (err) {
    console.warn("[dashboard] getRecentActivity failed:", err);
    return [];
  }
}

export async function getUpcomingRenewals(): Promise<Renewal[]> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("renewals")
      .select("*")
      .in("status", ["due", "contacted"])
      .gte("due_date", nowIso)
      .order("due_date", { ascending: true })
      .limit(10);
    if (error) throw error;
    return (data ?? []) as Renewal[];
  } catch (err) {
    console.warn("[dashboard] getUpcomingRenewals failed:", err);
    return [];
  }
}

export async function getOverdueItems(role?: string | null) {
  try {
    const nowIso = new Date().toISOString();
    const isPrivileged = role === "admin" || role === "manager";

    const { data: overdueRenData, error: renErr } = await supabase
      .from("renewals")
      .select("*")
      .in("status", ["due", "contacted"])
      .lte("due_date", nowIso)
      .order("due_date", { ascending: true })
      .limit(5);
    if (renErr) throw renErr;

    const renewals = (overdueRenData ?? []) as Renewal[];

    let premiums: Premium[] = [];
    if (isPrivileged) {
      const { data: overduePremsData, error: premErr } = await supabase
        .from("premiums")
        .select("*")
        .eq("status", "overdue")
        .limit(5);
      if (premErr) throw premErr;
      premiums = (overduePremsData ?? []) as Premium[];
    }

    return {
      premiums,
      renewals,
      overdueRenewals: renewals,
      overduePremiums: premiums,
    };
  } catch (err) {
    console.warn("[dashboard] getOverdueItems failed:", err);
    return { premiums: [], renewals: [], overdueRenewals: [], overduePremiums: [] };
  }
}

export async function getComplianceMatrix(): Promise<ValidityRegistry[]> {
  try {
    return await validityService.getExpiring(45);
  } catch (err) {
    console.warn("[dashboard] getComplianceMatrix failed:", err);
    return [];
  }
}

export async function getCelebrations() {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("customer_type", "individual")
      .limit(100);

    if (error) throw error;

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    return (data || []).filter(c => {
      const meta = c.entity_meta as any;
      if (!meta) return false;

      const checkMilestone = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return (d.getMonth() + 1 === currentMonth && d.getDate() >= currentDay && d.getDate() <= currentDay + 7);
      };

      return checkMilestone(meta.dob) || checkMilestone(meta.anniversary_date);
    }).map(c => ({
      id: c.id,
      name: c.name,
      type: (c.entity_meta as any)?.dob && new Date((c.entity_meta as any).dob).getMonth() === today.getMonth() ? 'birthday' : 'anniversary',
      date: (c.entity_meta as any)?.dob || (c.entity_meta as any)?.anniversary_date
    }));
  } catch (err) {
    console.warn("[dashboard] getCelebrations failed:", (err as Error)?.message || err);
    return [];
  }
}

export const dashboardService = {
  getStats: (role?: string | null) => getDashboardStats(role),
  getRecentActivity: (maxResults?: number, role?: string | null, userId?: string | null) => getRecentActivity(maxResults, role, userId),
  getUpcomingRenewals,
  getOverdueItems: (role?: string | null) => getOverdueItems(role),
  getComplianceMatrix,
  getCelebrations,
};
