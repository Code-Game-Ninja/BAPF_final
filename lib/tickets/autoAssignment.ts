/**
 * lib/tickets/autoAssignment.ts
 * Auto-assignment engine for service tickets.
 * Supports: round-robin, workload-based, skill-based
 */

import { supabaseAdmin } from "@/lib/supabase/server";

export type AssignmentMode = "round-robin" | "workload" | "skill";

interface EligibleAgent {
  id: string;
  name: string;
  openTickets: number;
}

/**
 * Get all active, non-leave agents eligible for assignment.
 */
async function getEligibleAgents(): Promise<EligibleAgent[]> {
  const { data: agents } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .in("role", ["admin", "manager", "employee"])
    .eq("status", "active");

  if (!agents || agents.length === 0) return [];

  // Get open ticket counts per agent
  const { data: ticketCounts } = await supabaseAdmin
    .from("service_tickets")
    .select("owner_id")
    .not("owner_id", "is", null)
    .not("status", "in", '("resolved","closed")');

  const countMap: Record<string, number> = {};
  for (const t of ticketCounts ?? []) {
    if (t.owner_id) countMap[t.owner_id] = (countMap[t.owner_id] || 0) + 1;
  }

  return agents.map(a => ({
    id: a.id,
    name: a.name,
    openTickets: countMap[a.id] || 0,
  }));
}

/**
 * Round-robin: assign to the agent who was assigned least recently.
 */
async function roundRobinAssign(category: string): Promise<string | null> {
  const agents = await getEligibleAgents();
  if (agents.length === 0) return null;

  // Find the agent with the oldest last assignment (or never assigned)
  const { data: lastAssignments } = await supabaseAdmin
    .from("service_tickets")
    .select("owner_id, created_at")
    .not("owner_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(agents.length * 2);

  const lastAssignedAt: Record<string, Date> = {};
  for (const t of lastAssignments ?? []) {
    if (t.owner_id && !lastAssignedAt[t.owner_id]) {
      lastAssignedAt[t.owner_id] = new Date(t.created_at);
    }
  }

  // Sort agents: those never assigned first, then by oldest last assignment
  const sorted = [...agents].sort((a, b) => {
    const aTime = lastAssignedAt[a.id]?.getTime() ?? 0;
    const bTime = lastAssignedAt[b.id]?.getTime() ?? 0;
    return aTime - bTime;
  });

  return sorted[0]?.id ?? null;
}

/**
 * Workload-based: assign to the agent with fewest open tickets.
 */
async function workloadAssign(): Promise<string | null> {
  const agents = await getEligibleAgents();
  if (agents.length === 0) return null;

  const sorted = [...agents].sort((a, b) => a.openTickets - b.openTickets);
  return sorted[0]?.id ?? null;
}

/**
 * Skill-based: assign to an agent with matching category expertise.
 * Falls back to workload-based if no skill match found.
 */
async function skillAssign(category: string): Promise<string | null> {
  // Check system_config for skill mappings
  const { data: skillConfig } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", `ticket_skill_${category}`)
    .maybeSingle();

  if (skillConfig?.value) {
    const agentIds = Array.isArray(skillConfig.value)
      ? skillConfig.value as string[]
      : [skillConfig.value as string];

    const agents = await getEligibleAgents();
    const skilled = agents.filter(a => agentIds.includes(a.id));

    if (skilled.length > 0) {
      const sorted = [...skilled].sort((a, b) => a.openTickets - b.openTickets);
      return sorted[0]?.id ?? null;
    }
  }

  // Fallback to workload
  return workloadAssign();
}

/**
 * Main auto-assignment function.
 * Reads mode from system_config, applies appropriate strategy.
 */
export async function autoAssignTicket(category: string): Promise<string | null> {
  try {
    const { data: config } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", "ticket_auto_assignment_mode")
      .maybeSingle();

    const mode: AssignmentMode = (config?.value as AssignmentMode) ?? "workload";

    switch (mode) {
      case "round-robin":
        return roundRobinAssign(category);
      case "skill":
        return skillAssign(category);
      case "workload":
      default:
        return workloadAssign();
    }
  } catch {
    return null;
  }
}
