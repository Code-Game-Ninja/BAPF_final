"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import useSWR from "swr";
import {
  Ticket, Plus, Search, Filter, X, AlertTriangle, Clock,
  CheckCircle, Users, User, Inbox, LayoutList, RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { SLACountdown } from "@/components/service-desk/SLACountdown";
import { CreateTicketDialog } from "@/components/service-desk/CreateTicketDialog";
import { Ticket as ServiceTicket, TicketMetrics } from "@/lib/types/service-desk";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Queue = "my" | "team" | "unassigned" | "all";

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pending:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  resolved:    "bg-green-500/10 text-green-400 border-green-500/20",
  closed:      "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400",
  high:   "bg-orange-500/10 text-orange-400",
  medium: "bg-amber-500/10 text-amber-400",
  low:    "bg-gray-500/10 text-gray-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  ecard_request:     "E-Card Request",
  member_endorsement:"Member Endorsement",
  name_correction:   "Name Correction",
  address_correction:"Address Correction",
  invoice_dispute:   "Invoice Dispute",
  claim_assistance:  "Claim Assistance",
  general_query:     "General Query",
};

async function fetchTickets(url: string, token: string): Promise<{ data: ServiceTicket[], total: number }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function fetchMetrics(token: string): Promise<TicketMetrics | null> {
  const res = await fetch("/api/service-desk/metrics?days=30", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function ServiceDeskPage() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [queue, setQueue] = useState<Queue>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [breachedOnly, setBreachedOnly] = useState(false);
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({
      queue,
      page: String(page),
      limit: "25",
      sort: "created_at",
      order: "desc",
    });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (breachedOnly) params.set("breached_only", "true");
    if (escalatedOnly) params.set("escalated_only", "true");
    return `/api/service-desk/tickets?${params}`;
  }, [queue, page, search, statusFilter, categoryFilter, priorityFilter, breachedOnly, escalatedOnly]);

  const { data: ticketsData, isLoading, mutate } = useSWR(
    token ? buildUrl() : null,
    (url) => fetchTickets(url, token),
    { revalidateOnFocus: false }
  );

  const { data: metrics } = useSWR(
    token ? `metrics-${token}` : null,
    () => fetchMetrics(token),
    { revalidateOnFocus: false, refreshInterval: 300_000 }
  );

  const tickets = ticketsData?.data ?? [];
  const total = ticketsData?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  const handleExport = () => {
    const rows = [
      ["Ticket #", "Customer", "Category", "Priority", "Status", "Created", "SLA Deadline"],
      ...tickets.map((t: ServiceTicket) => [
        t.ticket_number,
        t.customers?.name || "",
        CATEGORY_LABELS[t.category] || t.category,
        t.priority,
        t.status,
        t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy HH:mm") : "",
        t.sla_deadline ? format(new Date(t.sla_deadline), "dd/MM/yyyy HH:mm") : "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v)}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${tickets.length} tickets`);
  };

  const QUEUES: { key: Queue; label: string; icon: React.ComponentType<{ className?: string }> }[] = useMemo(() => [
    { key: "my",        label: "My Tickets",   icon: User },
    { key: "team",      label: "Team Tickets", icon: Users },
    { key: "unassigned",label: "Unassigned",   icon: Inbox },
    { key: "all",       label: "All Tickets",  icon: LayoutList },
  ], []);

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold uppercase tracking-wider flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            Service Desk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} tickets · {metrics?.breach_count ?? 0} breached
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => void mutate()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Open",        value: metrics.status_counts?.open || 0,        color: "text-blue-400" },
            { label: "In Progress", value: metrics.status_counts?.in_progress || 0, color: "text-amber-400" },
            { label: "Pending",     value: metrics.status_counts?.pending || 0,     color: "text-orange-400" },
            { label: "Overdue",     value: metrics.breach_count || 0,               color: "text-red-400" },
            { label: "Resolved",    value: metrics.status_counts?.resolved || 0,    color: "text-green-400" },
            { label: "SLA Rate",    value: `${metrics.sla_on_time_rate}%`,          color: "text-emerald-400", isText: true },
            { label: "Avg Resolve", value: metrics.avg_resolution_minutes > 0
                ? `${Math.round(metrics.avg_resolution_minutes / 60)}h`
                : "—",                                                               color: "text-purple-400", isText: true },
          ].map(({ label, value, color, isText }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">{label}</p>
              <p className={`font-bold mt-0.5 ${isText ? "text-sm" : "text-xl"} ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Queue Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {QUEUES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setQueue(key); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              queue === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search ticket #, description..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["open","in_progress","pending","resolved","closed"].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {["urgent","high","medium","low"].map(p => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={breachedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => { setBreachedOnly(!breachedOnly); setPage(1); }}
          className="gap-2 whitespace-nowrap"
        >
          <AlertTriangle className="w-4 h-4" />
          Breached Only
        </Button>
      </div>

      {/* Ticket Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Ticket className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No tickets found.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create First Ticket
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Ticket #</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Category</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Priority</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">SLA</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden xl:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t: ServiceTicket) => (
                <TableRow
                  key={t.id}
                  className="border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/dashboard/service-desk/${t.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{t.ticket_number}</span>
                      {t.escalation_level > 0 && (
                        <Badge className="bg-red-500/10 text-red-400 text-xs">L{t.escalation_level}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {t.customers?.name || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[t.category] || t.category}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[t.priority] || ""}`}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[t.status] || ""}`}>
                      {t.status?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {t.sla_deadline ? (
                      <SLACountdown
                        createdAt={t.created_at}
                        slaDeadline={t.sla_deadline}
                        isPaused={t.status === "pending"}
                        isBreached={t.is_breached}
                        compact
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                    {t.created_at ? format(new Date(t.created_at), "dd MMM yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createOpen}
        onOpenChange={open => { setCreateOpen(open); if (!open) void mutate(); }}
      />
    </motion.div>
  );
}
