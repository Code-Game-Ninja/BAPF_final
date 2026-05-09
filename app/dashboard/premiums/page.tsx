"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingUp,
  Shield,
  Trash2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ExportButton } from "@/components/global";
import {
  PremiumStatusBadge,
  PremiumStatusDialog,
  PremiumQuickActions,
} from "@/components/premiums/premium-actions";
import { PremiumChart } from "@/components/premiums/premium-chart-lazy";
import {
  usePremiums,
  usePremiumStats,
  invalidatePremiums,
} from "@/lib/hooks/use-premiums";
import { premiumService } from "@/lib/services/premium.service";
import { policyService } from "@/lib/services/policy.service";
import { auditLogService } from "@/lib/services/audit-log.service";


import { useAuth } from "@/lib/context/auth-context";
import { PREMIUM_STATUSES } from "@/lib/validations/premium";
import { hoverLift, pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import type { Premium, PremiumStatus } from "@/lib/types";

const PAGE_SIZE = 20;

export default function PremiumsPage() {
  const { user: dbUser } = useAuth();
  const isAdminOrManager =
    dbUser?.role === "admin" || dbUser?.role === "manager";

  // ---- State (must be before any early return to satisfy Rules of Hooks) ----
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showChart, setShowChart] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Status dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Premium | null>(null);
  const [selectedPremium, setSelectedPremium] = useState<Premium | null>(null);

  // ---- Data ----
  const {
    data: premiums,
    isLoading,
    error,
  } = usePremiums(
    statusFilter !== "all" ? (statusFilter as PremiumStatus) : undefined
  );

  const { data: stats } = usePremiumStats();

  // ---- Memoized: filter + search + paginate ----
  const filtered = useMemo(() => {
    if (!premiums) return [];
    if (!search.trim()) return premiums;

    const term = search.toLowerCase();
    return premiums.filter(
      (p) =>
        (p.period || "").toLowerCase().includes(term) ||
        (p.policy_id || "").toLowerCase().includes(term) ||
        (p.policy_number || "").toLowerCase().includes(term) ||
        (p.customer_name || "").toLowerCase().includes(term) ||
        (p.notes || "").toLowerCase().includes(term)
    );
  }, [premiums, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const collectionRate = useMemo(() => {
    const collected = stats?.totalCollected ?? 0;
    const pending = stats?.totalPending ?? 0;
    const overdue = stats?.totalOverdue ?? 0;
    const total = collected + pending + overdue;
    if (!total) return 0;
    return Math.round((collected / total) * 100);
  }, [stats]);

  const hasSearch = search.trim().length > 0;

  // ---- Handlers ----
  const handleGenerateAll = useCallback(async () => {
    if (!dbUser) return;
    setGenerating(true);
    try {
      // Get all active policies and generate premiums for each
      const policies = await policyService.getAll(
        [{ field: "status", operator: "==", value: "active" }],
        "createdAt",
        "desc"
      );

      let totalCreated = 0;
      let totalSkipped = 0;

      for (const policy of policies) {
        try {
          const result = await premiumService.generateForPolicy(
            policy.id,
            dbUser.id
          );
          totalCreated += result.created;
          totalSkipped += result.skipped;
        } catch {
          totalSkipped++;
        }
      }

      toast.success(
        `Generated ${totalCreated} premiums (${totalSkipped} skipped)`
      );
      invalidatePremiums();
    } catch {
      toast.error("Failed to generate premiums");
    } finally {
      setGenerating(false);
    }
  }, [dbUser]);

  // ---- Role guard (after all hooks) ----
  if (!isAdminOrManager) {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin or Manager access required</p>
      </div>
    );
  }

  // ---- Render ----
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className="mx-auto max-w-7xl space-y-5"
    >
      <section className="rounded-[2rem] border border-border bg-card/85 p-6 shadow-[0_12px_28px_rgba(47,62,64,0.05)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Collections Console
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-heading font-bold tracking-tight text-foreground">
              <DollarSign className="h-6 w-6 text-primary" />
              Premium Tracking
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track premium collections and payment status
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3 w-3" />
              Premium collections cockpit
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              data={filtered.map((premium) => ({
                period: premium.period || "",
                policy: premium.policy_number || premium.policy_id || "",
                customer: premium.customer_name || "",
                amount: premium.amount ?? 0,
                status: premium.status,
                notes: premium.notes || "",
              }))}
              filename="premiums"
              columns={{
                period: "Period",
                policy: "Policy",
                customer: "Customer",
                amount: "Amount (₹)",
                status: "Status",
                notes: "Notes",
              }}
            />

            <motion.div {...hoverLift}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChart(!showChart)}
                className="gap-2 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <BarChart3 className="h-4 w-4" />
                <span>{showChart ? "Hide" : "Show"} Chart</span>
              </Button>
            </motion.div>

            {isAdminOrManager && (
              <motion.div {...hoverLift}>
                <Button
                  onClick={handleGenerateAll}
                  disabled={generating}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Auto-Generate
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {[
          {
            label: "Collected",
            value: stats?.totalCollected ?? 0,
            amount: stats?.amountCollected ?? 0,
            icon: CheckCircle2,
            panelClass: "border-emerald-500/30 bg-emerald-500/10",
            textClass: "text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Pending",
            value: stats?.totalPending ?? 0,
            amount: stats?.amountPending ?? 0,
            icon: Clock,
            panelClass: "border-amber-500/30 bg-amber-500/10",
            textClass: "text-amber-700 dark:text-amber-300",
          },
          {
            label: "Overdue",
            value: stats?.totalOverdue ?? 0,
            amount: stats?.amountOverdue ?? 0,
            icon: AlertCircle,
            panelClass: "border-rose-500/30 bg-rose-500/10",
            textClass: "text-rose-700 dark:text-rose-300",
          },
          {
            label: "Collection Rate",
            value: `${collectionRate}%`,
            amount: hasSearch ? filtered.length : (stats?.totalCollected ?? 0) + (stats?.totalPending ?? 0) + (stats?.totalOverdue ?? 0),
            icon: TrendingUp,
            panelClass: "border-primary/30 bg-primary/10",
            textClass: "text-primary",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={staggerItem}
            {...hoverLift}
          >
            <Card className={stat.panelClass}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className={`mt-1 text-xl font-semibold tracking-tight ${stat.textClass}`}>
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {typeof stat.amount === "number" && stat.label !== "Collection Rate"
                        ? formatCurrency(stat.amount)
                        : `${stat.amount} records`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-2">
                    <stat.icon className={`h-4 w-4 ${stat.textClass}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {showChart && (
        <motion.div variants={staggerItem}>
          <div className="rounded-2xl border border-border bg-card/90 p-3 shadow-[0_8px_18px_rgba(47,62,64,0.04)]">
            <PremiumChart />
          </div>
        </motion.div>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-[0_8px_18px_rgba(47,62,64,0.04)] md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by period, policy, customer, notes..."
            className="border-border bg-muted/35 pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full border-border bg-card text-foreground md:w-44">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PREMIUM_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                <span style={{ color: status.color }}>{status.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <motion.div variants={staggerItem}>
        <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_10px_22px_rgba(47,62,64,0.04)]">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full bg-skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-500">
              <AlertCircle className="mx-auto mb-2 h-8 w-8" />
              Failed to load premiums
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <DollarSign className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {hasSearch ? "No premiums match your search" : "No premiums found"}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Period</TableHead>
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Policy ID
                      </TableHead>
                      <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Amount
                      </TableHead>
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
                      <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Notes</TableHead>
                      <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((premium) => (
                      <TableRow
                        key={premium.id}
                        className="border-border/70 hover:bg-muted/35"
                      >
                        <TableCell className="text-foreground font-medium">
                          {premium.period || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {premium.policy_number || premium.policy_id || "-"}
                        </TableCell>
                        <TableCell className="text-foreground text-right font-medium">
                          {formatCurrency(premium.amount ?? 0)}
                        </TableCell>
                        <TableCell>
                          <PremiumStatusBadge status={premium.status} />
                        </TableCell>
                        <TableCell className="max-w-52 truncate text-xs text-muted-foreground">
                          {premium.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PremiumQuickActions premium={premium} />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="View premium details"
                              onClick={() => {
                                setSelectedPremium(premium);
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {dbUser?.role === "admin" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                title="Delete Premium"
                                onClick={() => setDeleteTarget(premium)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-2 p-2 md:hidden"
              >
                {paginated.map((premium) => (
                  <motion.div key={premium.id} variants={staggerItem} {...hoverLift}>
                    <Card className="border-border bg-card/90">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {premium.period || "-"}
                          </span>
                          <PremiumStatusBadge status={premium.status} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Policy</span>
                          <span className="text-sm text-foreground">
                            {premium.policy_number || premium.policy_id || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(premium.amount ?? 0)}
                          </span>
                        </div>
                        {premium.notes && (
                          <p className="truncate text-xs text-muted-foreground">{premium.notes}</p>
                        )}
                        <div className="flex justify-end gap-1 pt-1">
                          <PremiumQuickActions premium={premium} />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => {
                              setSelectedPremium(premium);
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {dbUser?.role === "admin" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                              title="Delete Premium"
                              onClick={() => setDeleteTarget(premium)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {totalPages > 1 && (
                <section className="flex items-center justify-between border-t border-border/70 px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} · {filtered.length} total
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      disabled={page === 1}
                      className="h-7"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPage((currentPage) => Math.min(totalPages, currentPage + 1))
                      }
                      disabled={page === totalPages}
                      className="h-7"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </motion.div>

      <PremiumStatusDialog
        premium={selectedPremium}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Premium</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this premium{deleteTarget?.period ? ` for ${deleteTarget.period}` : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-strong text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                if (!deleteTarget || !dbUser) return;
                try {
                  await premiumService.delete(deleteTarget.id);
                  toast.success("Premium deleted");
                  invalidatePremiums();
                  auditLogService.logAction(
                    dbUser.uid || dbUser.id, dbUser.name || "", "delete", "premiums",
                    `Deleted premium ${deleteTarget.id} (${deleteTarget.period})`
                  ).catch((err) => {
                    console.error(`[AuditLog] Failed to log delete for premium ${deleteTarget.id} by user ${dbUser.uid || dbUser.id}:`, err);
                  });
                } catch {
                  toast.error("Failed to delete premium");
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
