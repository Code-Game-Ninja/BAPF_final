/**
 * GET /api/service-desk/metrics — service desk metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: tickets } = await supabaseAdmin
    .from("service_tickets")
    .select("status, category, priority, is_breached, resolved_on_time, resolution_time_minutes, owner_id, created_at")
    .gte("created_at", since);

  const all = tickets ?? [];

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const t of all) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  for (const t of all) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1;
  }

  // Priority breakdown
  const priorityBreakdown: Record<string, number> = {};
  for (const t of all) {
    priorityBreakdown[t.priority] = (priorityBreakdown[t.priority] || 0) + 1;
  }

  // SLA metrics
  const resolved = all.filter(t => t.status === "resolved" || t.status === "closed");
  const onTime = resolved.filter(t => t.resolved_on_time === true).length;
  const slaOnTimeRate = resolved.length > 0 ? Math.round((onTime / resolved.length) * 100) : 0;
  const breachCount = all.filter(t => t.is_breached).length;

  const resolutionTimes = resolved
    .map(t => t.resolution_time_minutes)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const avgResolutionMinutes = resolutionTimes.length > 0
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : 0;

  // Agent performance
  const agentMap: Record<string, { resolved: number; totalMinutes: number; onTime: number }> = {};
  for (const t of resolved) {
    if (!t.owner_id) continue;
    if (!agentMap[t.owner_id]) agentMap[t.owner_id] = { resolved: 0, totalMinutes: 0, onTime: 0 };
    agentMap[t.owner_id].resolved++;
    if (t.resolution_time_minutes) agentMap[t.owner_id].totalMinutes += t.resolution_time_minutes;
    if (t.resolved_on_time) agentMap[t.owner_id].onTime++;
  }

  // Fetch agent names
  const agentIds = Object.keys(agentMap);
  const { data: agents } = agentIds.length > 0
    ? await supabaseAdmin.from("users").select("id, name").in("id", agentIds)
    : { data: [] };

  const agentNameMap: Record<string, string> = {};
  for (const a of agents ?? []) agentNameMap[a.id] = a.name;

  const agentPerformance = Object.entries(agentMap).map(([agentId, stats]) => ({
    agent_id: agentId,
    agent_name: agentNameMap[agentId] || "Unknown",
    tickets_resolved: stats.resolved,
    avg_resolution_minutes: stats.resolved > 0 ? Math.round(stats.totalMinutes / stats.resolved) : 0,
    sla_compliance_rate: stats.resolved > 0 ? Math.round((stats.onTime / stats.resolved) * 100) : 0,
  }));

  return NextResponse.json({
    period_days: days,
    total_tickets: all.length,
    status_counts: statusCounts,
    category_breakdown: categoryBreakdown,
    priority_breakdown: priorityBreakdown,
    sla_on_time_rate: slaOnTimeRate,
    avg_resolution_minutes: avgResolutionMinutes,
    breach_count: breachCount,
    agent_performance: agentPerformance,
  });
}
