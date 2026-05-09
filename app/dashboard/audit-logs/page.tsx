"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAuditLogs,
  useAuditStats,
} from "@/lib/hooks/use-audit-logs";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  getActionConfig,
  getModuleLabel,
} from "@/lib/validations/audit-log";
import {
  ActionBadge,
  ActionIcon,
  ModuleBadge,
  LogTimestamp,
} from "@/components/audit-logs/audit-log-badges";
import { ExportButton } from "@/components/global";
import {
  Shield,
  Search,
  Loader2,
  Activity,
  Clock,
  Users,
  FileText,
  Eye,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { AuditLog } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

export default function AuditLogsPage() {
  const { role } = useAuth();
  const isAdminOrManager = role === "admin" || role === "manager";

  const { data: logs, isLoading } = useAuditLogs();
  const { data: stats } = useAuditStats();

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const PAGE_SIZE = 20;

  if (!isAdminOrManager) {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin or Manager access required</p>
      </div>
    );
  }

  // Filter
  const filtered = (logs || []).filter((log) => {
    const details = log.details || "";
    const matchesSearch =
      !search ||
      (log.user_name || "").toLowerCase().includes(search.toLowerCase()) ||
      details.toLowerCase().includes(search.toLowerCase()) ||
      log.module.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());

    const matchesAction =
      actionFilter === "all" || log.action === actionFilter;

    const matchesModule =
      moduleFilter === "all" || log.module === moduleFilter;

    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      if (!log.createdAt) return false;
      const logDate = new Date(log.createdAt);
      if (dateFrom && logDate < new Date(dateFrom)) return false;
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        if (logDate > endDate) return false;
      }
      return true;
    })();

    return matchesSearch && matchesAction && matchesModule && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  // Export data
  const exportColumns = {
    timestamp: "Timestamp",
    user_name: "User",
    action: "Action",
    module: "Module",
    details: "Details",
  };
  const exportData = filtered.map((log) => ({
    timestamp: log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "",
    user_name: log.user_name || log.user_id,
    action: log.action,
    module: log.module,
    details: log.details || "",
  }));

  // Top actors from stats
  const topModules = stats
    ? Object.entries(stats.byModule)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : [];

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Compliance timeline
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Audit Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              Immutable activity trail for all critical system actions.
            </p>
          </div>
          <div className="sm:ml-4">
            <ExportButton data={exportData} columns={exportColumns} filename="audit-logs" />
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            {
              icon: Activity,
              label: "Total Logs",
              value: stats.total,
              panel: "border-blue-500/30 bg-blue-500/10",
              text: "text-blue-700 dark:text-blue-300",
            },
            {
              icon: Clock,
              label: "Today",
              value: stats.todayCount,
              panel: "border-indigo-500/30 bg-indigo-500/10",
              text: "text-indigo-700 dark:text-indigo-300",
            },
            {
              icon: FileText,
              label: "Actions",
              value: Object.keys(stats.byAction).length,
              panel: "border-emerald-500/30 bg-emerald-500/10",
              text: "text-emerald-700 dark:text-emerald-300",
            },
            {
              icon: Users,
              label: "Top Module",
              value: topModules[0] ? getModuleLabel(topModules[0][0]) : "—",
              panel: "border-amber-500/30 bg-amber-500/10",
              text: "text-amber-700 dark:text-amber-300",
            },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <Card className={item.panel}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className={`mt-1 truncate text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                      <item.icon className={`h-4 w-4 ${item.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Action breakdown */}
      {stats && Object.keys(stats.byAction).length > 0 && (
        <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.05)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-heading uppercase tracking-[0.12em]">Action Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.entries(stats.byAction)
                .sort(([, a], [, b]) => b - a)
                .map(([action, count]) => {
                  const cfg = getActionConfig(action);
                  return (
                    <div
                      key={action}
                      className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/85 px-3 py-2"
                    >
                      <ActionIcon action={action} className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground text-sm truncate">
                        {cfg?.label || action}
                      </span>
                      <Badge
                        variant="secondary"
                        className="h-5 text-xs bg-skeleton text-foreground ml-auto shrink-0"
                      >
                        {count}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        {/* Search + Action Filter + Module Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, details, module..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 bg-background/80 border-border/80 text-foreground"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => handleFilterChange(setActionFilter, v)}>
            <SelectTrigger className="w-full bg-background/80 border-border/80 text-foreground">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">
                All Actions
              </SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem
                  key={a.value}
                  value={a.value}
                >
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={(v) => handleFilterChange(setModuleFilter, v)}>
            <SelectTrigger className="w-full bg-background/80 border-border/80 text-foreground">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">
                All Modules
              </SelectItem>
              {AUDIT_MODULES.map((m) => (
                <SelectItem
                  key={m.value}
                  value={m.value}
                >
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Date Range + Export */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none sm:w-35 bg-background/80 border-border/80 text-foreground text-sm"
              placeholder="From"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none sm:w-35 bg-background/80 border-border/80 text-foreground text-sm"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:bg-muted" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Results count */}
      <p className="rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-muted-foreground text-sm">
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} logs
        {filtered.length !== (logs || []).length && ` (${(logs || []).length} total)`}
      </p>

      {/* Logs Table */}
      <Card className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-16">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/80 bg-muted/20">
                      <TableHead className="w-12.5" />
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">User</TableHead>
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Action</TableHead>
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Module</TableHead>
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Details</TableHead>
                      <TableHead className="w-12.5" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((log) => (
                      <TableRow key={log.id} className="border-border/70 hover:bg-muted/35">
                        <TableCell>
                          <ActionIcon action={log.action} />
                        </TableCell>
                        <TableCell>
                          {log.createdAt && (
                            <LogTimestamp timestamp={log.createdAt} />
                          )}
                        </TableCell>
                        <TableCell className="text-foreground text-sm font-medium">
                          {log.user_name || log.user_id}
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell>
                          <ModuleBadge module={log.module} />
                        </TableCell>
                        <TableCell className="max-w-75 truncate text-sm text-muted-foreground">
                          {log.details || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label="View log details"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border/70">
                {paginated.map((log) => (
                  <div key={log.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ActionIcon action={log.action} />
                        <ActionBadge action={log.action} />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">User</span>
                        <span className="text-foreground font-medium truncate max-w-[60%]">
                          {log.user_name || log.user_id}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Module</span>
                        <ModuleBadge module={log.module} />
                      </div>
                      {log.createdAt && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Time</span>
                          <LogTimestamp timestamp={log.createdAt} />
                        </div>
                      )}
                    </div>
                    {log.details && (
                      <p className="border-t border-border/60 pt-2 text-xs text-muted-foreground line-clamp-2">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-border-strong/60 bg-card/80 p-3">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-border text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-border text-foreground"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-lg rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <DetailRow label="Record ID" value={selectedLog.id} mono />
              <DetailRow
                label="Timestamp"
                value={
                  selectedLog.createdAt
                    ? new Date(selectedLog.createdAt).toLocaleString("en-IN")
                    : "—"
                }
              />
              <DetailRow
                label="User"
                value={selectedLog.user_name || selectedLog.user_id}
              />
              <DetailRow label="User ID" value={selectedLog.user_id} mono />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Action</span>
                <ActionBadge action={selectedLog.action} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Module</span>
                <ModuleBadge module={selectedLog.module} />
              </div>
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Details</span>
                <div className="rounded-lg border border-border bg-background/85 p-3 font-mono text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                  {selectedLog.details || "-"}
                </div>
              </div>
              {selectedLog.ip_address && (
                <DetailRow label="IP Address" value={selectedLog.ip_address} mono />
              )}
              {selectedLog.pdfUploaded && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">PDF Upload</span>
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/40">
                    Yes
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ---- Helper ----

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-sm text-foreground text-right truncate ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
