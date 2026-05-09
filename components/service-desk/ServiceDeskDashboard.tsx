"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, RefreshCw, Download, Users2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { TicketQueueTabs, type QueueType } from "./TicketQueueTabs";
import { TicketMetricsBar } from "./TicketMetricsBar";
import { TicketListTable } from "./TicketListTable";
import { TicketFilters, type TicketFiltersState } from "./TicketFilters";

const DEFAULT_FILTERS: TicketFiltersState = {
  search: "",
  category: "",
  priority: "",
  status: "",
  assignedTo: "",
  customerId: "",
  policyId: "",
  breachedOnly: false,
  escalatedOnly: false,
  includeArchived: false,
};

async function fetchTickets(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function fetchMetrics(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export function ServiceDeskDashboard() {
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const [activeQueue, setActiveQueue] = useState<QueueType>("my");
  const [filters, setFilters] = useState<TicketFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ field: "created_at", order: "desc" as "asc" | "desc" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Build query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("queue", activeQueue);
    params.set("page", String(page));
    params.set("limit", "25");
    params.set("sort", sort.field);
    params.set("order", sort.order);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.category) params.set("category", filters.category);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.status) params.set("status", filters.status);
    if (filters.assignedTo) params.set("assigned_to", filters.assignedTo);
    if (filters.customerId) params.set("customer_id", filters.customerId);
    if (filters.policyId) params.set("policy_id", filters.policyId);
    if (filters.breachedOnly) params.set("breached_only", "true");
    if (filters.escalatedOnly) params.set("escalated_only", "true");
    if (filters.includeArchived) params.set("include_archived", "true");
    return params.toString();
  }, [activeQueue, page, sort, debouncedSearch, filters]);

  const ticketsKey = token ? `/api/service-desk/tickets?${buildQueryParams()}` : null;
  const metricsKey = token ? `/api/service-desk/metrics` : null;

  const { data: ticketsData, isLoading: ticketsLoading, mutate: mutateTickets } = useSWR(
    ticketsKey,
    (url: string) => fetchTickets(url, token),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const { data: metricsData, isLoading: metricsLoading } = useSWR(
    metricsKey,
    (url: string) => fetchMetrics(url, token),
    { revalidateOnFocus: false, refreshInterval: 60000 }
  );

  // Debounce search
  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
  };

  const handleSortChange = (field: string) => {
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === "desc" ? "asc" : "desc",
    }));
    setPage(1);
  };

  const handleQueueChange = (queue: QueueType) => {
    setActiveQueue(queue);
    setPage(1);
    setSelectedIds([]);
    // Persist in localStorage
    try {
      localStorage.setItem("service_desk_queue", queue);
    } catch { /* ignore */ }
  };

  // Restore queue preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("service_desk_queue") as QueueType | null;
      if (saved && ["my", "team", "unassigned", "all"].includes(saved)) {
        setActiveQueue(saved);
      }
    } catch { /* ignore */ }
  }, []);

  const handleExport = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/service-desk/tickets/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation: "export",
          ticket_ids: ticketsData?.data?.map((t: { id: string }) => t.id) ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Convert to CSV
      const tickets = data.data ?? [];
      if (tickets.length === 0) {
        toast.info("No tickets to export");
        return;
      }

      const headers = ["Ticket #", "Customer", "Category", "Priority", "Status", "SLA Deadline", "Created", "Resolved", "Owner"];
      const rows = tickets.map((t: Record<string, unknown>) => [
        t.ticket_number,
        (t.customers as { name: string } | null)?.name ?? "",
        t.category,
        t.priority,
        t.status,
        t.sla_deadline ?? "",
        t.created_at,
        t.resolved_at ?? "",
        (t.owner as { name: string } | null)?.name ?? "",
      ]);

      const csv = [headers, ...rows].map(r => r.map((v: unknown) => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${tickets.length} tickets`);
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const tickets = ticketsData?.data ?? [];
  const total = ticketsData?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  const metrics = metricsData ?? {
    status_counts: {},
    overdue_count: 0,
    sla_on_time_rate: 100,
    avg_resolution_minutes: 0,
    breach_count: 0,
  };

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users2 className="w-6 h-6 text-primary" />
            Service Desk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} tickets · {metrics.overdue_count} overdue
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => mutateTickets()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => router.push("/dashboard/service-desk/new")} className="gap-2">
            <Plus className="w-4 h-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <TicketMetricsBar
        statusCounts={metrics.status_counts}
        overdueCount={metrics.overdue_count}
        slaOnTimeRate={metrics.sla_on_time_rate}
        avgResolutionMinutes={metrics.avg_resolution_minutes}
        breachCount={metrics.breach_count}
        isLoading={metricsLoading}
      />

      {/* Main content */}
      <div className="flex gap-4">
        {/* Left sidebar: Queue tabs + Filters */}
        <div className="w-56 flex-shrink-0 space-y-4">
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Queues
            </p>
            <TicketQueueTabs
              activeQueue={activeQueue}
              onQueueChange={handleQueueChange}
              counts={{
                my: metricsData?.queue_counts?.my,
                team: metricsData?.queue_counts?.team,
                unassigned: metricsData?.queue_counts?.unassigned,
                all: total,
              }}
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-3">
            <TicketFilters
              filters={filters}
              onFiltersChange={f => { setFilters(f); setPage(1); }}
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Main table */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <TicketListTable
              tickets={tickets}
              isLoading={ticketsLoading}
              sort={sort}
              onSortChange={handleSortChange}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              showBulkActions={role === "admin" || role === "manager"}
            />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
