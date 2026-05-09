"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  RefreshCw, Search, Filter, List, LayoutGrid, Download,
  AlertCircle, Phone, TrendingUp, CheckCircle2, XCircle,
  IndianRupee, Eye, X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";
import { RenewalRiskBadge } from "@/components/renewals/RenewalRiskBadge";

interface RenewalEntry {
  id: string;
  stage: string;
  risk_score?: number;
  last_contact_date?: string;
  customers?: {
    name: string;
    phone?: string;
  };
  policies?: {
    policy_number: string;
    policy_type: string;
    end_date: string;
    premium_amount: number;
  };
}

interface PipelineResponse {
  data: RenewalEntry[];
}

interface AnalyticsResponse {
  stageCounts: Record<string, number>;
  conversionRate: number;
  premiumAtRisk: number;
}

const PAGE_SIZE = 50;

const STAGE_COLORS: Record<string, string> = {
  due: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  contacted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  negotiating: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  renewed: "bg-green-500/10 text-green-400 border-green-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
};

const KANBAN_STAGES = ["due", "contacted", "negotiating", "renewed", "lost"] as const;

function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function RenewalCockpitPage() {
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [policyTypeFilter, setPolicyTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Build query params
  const params = new URLSearchParams();
  if (stageFilter !== "all") params.set("stage", stageFilter);
  if (policyTypeFilter !== "all") params.set("policy_type", policyTypeFilter);
  if (search) params.set("search", search);
  params.set("limit", "200"); // load more for kanban

  const { data: pipelineData, isLoading } = useSWR<PipelineResponse>(
    token ? [`/api/renewals/pipeline?${params}`, token] : null,
    ([url, t]: [string, string]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const { data: analytics } = useSWR<AnalyticsResponse>(
    token ? [`/api/renewals/analytics`, token] : null,
    ([url, t]: [string, string]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const entries = pipelineData?.data ?? [];

  // Paginate for list view
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const paginated = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Kanban grouping
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, RenewalEntry[]> = {};
    for (const stage of KANBAN_STAGES) groups[stage] = [];
    for (const entry of entries) {
      if (groups[entry.stage]) groups[entry.stage].push(entry);
    }
    return groups;
  }, [entries]);

  const handleExport = async () => {
    if (!token) return;
    const ids = entries.map((e) => e.id);
    if (ids.length === 0) { toast.error("No renewals to export"); return; }

    try {
      const res = await fetch("/api/renewals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "export_csv", ids }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `renewals-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully");
    } catch {
      toast.error("Export failed");
    }
  };

  const stageCounts = analytics?.stageCounts ?? {};
  const conversionRate = analytics?.conversionRate ?? 0;
  const premiumAtRisk = analytics?.premiumAtRisk ?? 0;

  const metrics = [
    { label: "Due", value: stageCounts.due ?? 0, color: "text-amber-400", icon: AlertCircle },
    { label: "Contacted", value: stageCounts.contacted ?? 0, color: "text-blue-400", icon: Phone },
    { label: "Negotiating", value: stageCounts.negotiating ?? 0, color: "text-purple-400", icon: TrendingUp },
    { label: "Renewed", value: stageCounts.renewed ?? 0, color: "text-green-400", icon: CheckCircle2 },
    { label: "Lost", value: stageCounts.lost ?? 0, color: "text-red-400", icon: XCircle },
    { label: "Conversion", value: `${conversionRate}%`, color: "text-primary", icon: TrendingUp },
    { label: "Premium at Risk", value: fmt(premiumAtRisk), color: "text-orange-400", icon: IndianRupee },
  ];

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-primary" />
            Renewal Cockpit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your renewal pipeline — {entries.length} renewals
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          {(role === "admin" || role === "manager") && (
            <Button size="sm" onClick={() => router.push("/dashboard/renewals/new")} className="gap-2">
              + Add Renewal
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {metrics.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider truncate">{label}</p>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, policy #, insurer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {KANBAN_STAGES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={policyTypeFilter} onValueChange={(v) => { setPolicyTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Policy Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["motor", "health", "life", "fire", "marine", "other"].map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 border border-border rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="h-7 px-2"
            onClick={() => setViewMode("list")}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "default" : "ghost"}
            className="h-7 px-2"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-xl">
          <RefreshCw className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No renewals in pipeline.</p>
        </div>
      ) : viewMode === "list" ? (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider font-heading">Customer</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Policy #</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">Type</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading">Expiry</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Premium</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading">Risk</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading">Stage</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">Last Contact</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/dashboard/renewals/${entry.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{entry.customers?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{entry.customers?.phone ?? ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">
                      {entry.policies?.policy_number ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs capitalize">
                      {entry.policies?.policy_type?.replace(/_/g, " ") ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.policies?.end_date
                        ? format(new Date(entry.policies.end_date), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {entry.policies?.premium_amount
                        ? fmt(entry.policies.premium_amount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <RenewalRiskBadge score={entry.risk_score ?? 0} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${STAGE_COLORS[entry.stage] ?? ""}`}
                      >
                        {entry.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {entry.last_contact_date
                        ? format(new Date(entry.last_contact_date), "dd MMM")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => router.push(`/dashboard/renewals/${entry.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, entries.length)} of {entries.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto">
          {KANBAN_STAGES.map((stage) => (
            <div key={stage} className="min-w-[220px]">
              <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg border ${STAGE_COLORS[stage]}`}>
                <span className="text-xs font-heading font-bold uppercase tracking-wider capitalize">{stage}</span>
                <Badge variant="outline" className={`text-xs ${STAGE_COLORS[stage]}`}>
                  {kanbanGroups[stage]?.length ?? 0}
                </Badge>
              </div>
              <div className="space-y-2">
                {(kanbanGroups[stage] ?? []).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => router.push(`/dashboard/renewals/${entry.id}`)}
                    className="w-full text-left p-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{entry.customers?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {entry.policies?.policy_number ?? "—"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <RenewalRiskBadge score={entry.risk_score ?? 0} showScore={false} />
                      <span className="text-xs text-muted-foreground">
                        {entry.policies?.end_date
                          ? format(new Date(entry.policies.end_date), "dd MMM")
                          : "—"}
                      </span>
                    </div>
                    {entry.policies?.premium_amount && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {fmt(entry.policies.premium_amount)}
                      </p>
                    )}
                  </button>
                ))}
                {(kanbanGroups[stage] ?? []).length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No renewals
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
