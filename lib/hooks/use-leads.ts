import useSWR, { mutate } from "swr";
import {
  searchLeads, getLeadCount, getTodayFollowUps, getOverdueFollowUps,
} from "@/lib/services/lead.service";
import { SalesLead, LeadTimeline, LeadDocument, LeadReminder } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import {
  useCollection,
  useDoc,
  QueryFilter as RTFilter,
} from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

export type { RTFilter as QueryFilter };

// ─── Real-time hooks ─────────────────────────────────────────────

export function useLeads(filters?: RTFilter[]) {
  const { user } = useAuth();
  const key = filters
    ? `leads-${JSON.stringify(filters)}`
    : "leads-all";

  const result = useCollection<SalesLead>(
    user ? key : null,
    "sales_leads",
    filters,
    "created_at",
    "desc"
  );

  // Filter out soft-deleted leads on the client side
  const activeData = result.data?.filter((l) => !l.deleted_at);

  return {
    ...result,
    data: activeData,
  };
}

export function useLead(id: string | null) {
  return useDoc<SalesLead>(
    id ? `lead-${id}` : null,
    "sales_leads",
    id
  );
}

export function useLeadTimeline(leadId: string | null) {
  return useCollection<LeadTimeline>(
    leadId ? `lead-timeline-${leadId}` : null,
    "lead_timeline",
    leadId ? [{ field: "lead_id", operator: "==", value: leadId }] : undefined,
    "created_at",
    "desc"
  );
}

export function useLeadDocuments(leadId: string | null) {
  return useCollection<LeadDocument>(
    leadId ? `lead-docs-${leadId}` : null,
    "lead_documents",
    leadId ? [{ field: "lead_id", operator: "==", value: leadId }] : undefined,
    "created_at",
    "desc"
  );
}

// ─── SWR hooks ─────────────────────────────────────────────────────

export function useLeadSearch(query: string) {
  return useSWR<SalesLead[]>(
    query.length >= 2 ? `lead-search-${query}` : null,
    () => searchLeads(query),
    { revalidateOnFocus: false, dedupingInterval: 300 }
  );
}

export function useLeadCount() {
  const { user } = useAuth();
  const swr = useSWR<number>(
    user ? "lead-count" : null,
    () => getLeadCount(),
  );
  useRealtimeSubscription(swr, "sales_leads");
  return swr;
}

export function useTodayFollowUps(userId?: string) {
  const { user } = useAuth();
  return useSWR<SalesLead[]>(
    user ? `lead-followups-today-${userId || "all"}` : null,
    () => getTodayFollowUps(userId),
    { revalidateOnFocus: true, refreshInterval: 300_000 }
  );
}

export function useOverdueFollowUps(userId?: string) {
  const { user } = useAuth();
  return useSWR<SalesLead[]>(
    user ? `lead-followups-overdue-${userId || "all"}` : null,
    () => getOverdueFollowUps(userId),
    { revalidateOnFocus: true, refreshInterval: 300_000 }
  );
}

export function useLeadReminders(leadId: string | null) {
  const { user } = useAuth();
  return useSWR<LeadReminder[]>(
    user && leadId ? `lead-reminders-${leadId}` : null,
    async () => {
      const res = await fetch(`/api/leads/${leadId}/reminders`);
      if (!res.ok) throw new Error("Failed to fetch reminders");
      return res.json();
    },
    { revalidateOnFocus: false }
  );
}

export function invalidateLeads() {
  mutate((key) => typeof key === "string" && key.startsWith("lead"), undefined, {
    revalidate: true,
  });
}
