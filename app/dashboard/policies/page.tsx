"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FileSpreadsheet,
  Filter,
  Shield,
  ChevronLeft,
  ChevronRight,
  Calendar,
  IndianRupee,
  Building2,
  AlertCircle,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { PolicyForm } from "@/components/policies/policy-form";
import { BulkImport } from "@/components/policies/bulk-import";
import { usePolicies, usePolicyCount, invalidatePolicies } from "@/lib/hooks/use-policies";
import { policyService } from "@/lib/services/policy.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { exportPoliciesToCSV } from "@/lib/utils/export";

import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { parsePolicyTypes } from "@/lib/validations/policy";
import { hoverLift, pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { formatCurrency, formatCurrencyLabel } from "@/lib/utils";
import { PolicyTable } from "@/components/policies/PolicyTable";
import type { Policy } from "@/lib/types";

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  expired: "bg-red-500/20 text-red-400",
  cancelled: "bg-yellow-500/20 text-yellow-400",
  archived: "bg-muted-foreground/20 text-muted-foreground",
};

export default function PoliciesPage() {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const router = useRouter();
  const [nowMs] = useState(() => Date.now());
  const isEmployee = user?.role === "employee";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const policyTypes = parsePolicyTypes(settings.policy_types);

  // State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingPolicyId, setDeletingPolicyId] = useState<string | null>(null);
  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState<Policy | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Fetch
  const { data: allPolicies, isLoading, error, mutate } = usePolicies();
  const { data: totalCount } = usePolicyCount();

  // Filter + search
  const filteredPolicies = useMemo(() => {
    if (!allPolicies) return [];

    let result = [...allPolicies];

    // Employee sees only assigned policies
    if (isEmployee && user) {
      result = result.filter((p) => p.assigned_to === user.uid);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((p) => p.policy_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.policy_number?.toLowerCase().includes(q) ||
          p.customer_name?.toLowerCase().includes(q) ||
          p.insurer_name?.toLowerCase().includes(q) ||
          p.assigned_to_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allPolicies, searchQuery, typeFilter, statusFilter, isEmployee, user]);

  // Pagination
  const totalPages = Math.ceil(filteredPolicies.length / PAGE_SIZE);
  const paginatedPolicies = filteredPolicies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const expiringSoonCount = useMemo(
    () =>
      filteredPolicies.filter((policy) => {
        if (!policy.end_date) return false;
        try {
          const endMs = new Date(policy.end_date).getTime();
          const daysLeft = (endMs - nowMs) / (1000 * 60 * 60 * 24);
          return daysLeft > 0 && daysLeft <= settings.policy_expiry_warning_days;
        } catch {
          return false;
        }
      }).length,
    [filteredPolicies, nowMs, settings.policy_expiry_warning_days]
  );

  function formatDate(timestamp: unknown): string {
    if (!timestamp) return "—";
    try {
      if (typeof timestamp === "object" && timestamp !== null && "seconds" in timestamp) {
        const seconds = (timestamp as { seconds: number }).seconds;
        if (typeof seconds === "number") {
          return new Date(seconds * 1000).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
      }

      const date = new Date(timestamp as string | number | Date);
      if (isNaN(date.getTime())) return "—";
      
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  // Check if policy is eligible for email reminder
  function canSendReminder(policy: Policy): boolean {
    // Allow sending email for any policy that has an end_date
    return !!policy.end_date;
  }

  // Send email reminder for a policy
  async function handleSendEmailReminder(policy: Policy) {
    if (!user) return;
    // Employee can only remind for assigned policies
    if (isEmployee && policy.assigned_to !== user.uid) return;

    setSendingReminderId(policy.id);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const res = await fetch("/api/email/send-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          policy_id: policy.id,
          type: "policy_expiry",
        }),
      });

      const data = (await res.json()) as { sentTo?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Failed to send reminder");
        return;
      }

      toast.success(`Reminder email sent to ${data.sentTo}`);
    } catch {
      toast.error("Failed to send reminder email");
    } finally {
      setSendingReminderId(null);
    }
  }

  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className="space-y-5"
    >
      <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col gap-4 rounded-[2rem] border border-border bg-card/85 p-6 shadow-[0_12px_28px_rgba(47,62,64,0.05)] backdrop-blur sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Policy Operations</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground">
            Policies
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isEmployee
              ? "Your assigned policies"
              : `${totalCount ?? "..."} total policies`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <motion.div {...hoverLift}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportPoliciesToCSV(filteredPolicies)}
                className="flex items-center gap-2 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </motion.div>
          )}
          {isAdminOrManager && (
            <motion.div {...hoverLift}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkImport(true)}
                className="flex items-center gap-2 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Bulk Import</span>
              </Button>
            </motion.div>
          )}
          <motion.div {...hoverLift}>
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-[#2f3e40] text-white hover:bg-[#5d787a]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Policy</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-[0_8px_18px_rgba(47,62,64,0.04)] sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="border-border bg-muted/35 pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <motion.div {...hoverLift}>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-35 border-border bg-muted/35 text-muted-foreground">
                <Filter className="mr-1 h-3.5 w-3.5" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {policyTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div {...hoverLift}>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-32.5 border-border bg-muted/35 text-muted-foreground">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div {...hoverLift} className="rounded-xl border border-border bg-card/85 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Visible Policies</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{filteredPolicies.length}</p>
        </motion.div>
        <motion.div {...hoverLift} className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">Active</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">{filteredPolicies.filter((p) => p.status === "active").length}</p>
        </motion.div>
        <motion.div {...hoverLift} className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">Expiring Soon</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-amber-700 dark:text-amber-300">{expiringSoonCount}</p>
        </motion.div>
        <motion.div {...hoverLift} className="rounded-xl border border-primary/35 bg-primary/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Smart Ops</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Reminder Ready</p>
        </motion.div>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl bg-skeleton" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-300/60 bg-red-100/60">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-700" />
            <p className="text-sm text-red-700">
              Failed to load policies. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!isLoading && !error && (
        <>
          <div className="hidden md:block">
            <PolicyTable 
              policies={paginatedPolicies}
              isAdmin={isAdminOrManager}
              onDelete={(p) => setDeleteTargetPolicy(p)}
              onSendEmail={(p) => void handleSendEmailReminder(p)}
              sendingReminderId={sendingReminderId}
              deletingPolicyId={deletingPolicyId}
            />
          </div>

          {/* Mobile Cards */}
          <div
            className="space-y-3 md:hidden"
          >
            {paginatedPolicies.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  {searchQuery || typeFilter !== "all"
                    ? "No policies match your filters"
                    : "No policies yet"}
                </CardContent>
              </Card>
            ) : (
              paginatedPolicies.map((policy) => (
                <motion.div
                  key={policy.id}
                  variants={staggerItem}
                  {...hoverLift}
                  onClick={() =>
                    router.push(`/dashboard/policies/${policy.id}`)
                  }
                >
                  <Card className="cursor-pointer border-border bg-card/90 shadow-[0_8px_18px_rgba(47,62,64,0.04)] transition-colors hover:border-border-strong hover:bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-mono text-sm font-bold">
                            {policy.policy_number}
                          </p>
                          <p className="text-sm text-foreground">
                            {policy.customer_name}
                          </p>
                        </div>
                        <Badge
                          className={`text-xs capitalize ${
                            STATUS_COLORS[policy.status] || ""
                          }`}
                        >
                          {policy.status}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {policy.policy_type}
                        </span>
                        <span className="flex items-center gap-1" aria-label={formatCurrencyLabel(policy.premium_amount)}>
                          <IndianRupee className="h-3 w-3" />
                          {formatCurrency(policy.premium_amount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(policy.end_date)}
                        </span>
                        {policy.insurer_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {policy.insurer_name}
                          </span>
                        )}
                      </div>

                      {canSendReminder(policy) && (
                        <div className="mt-2 border-t border-muted-foreground/10 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                            disabled={sendingReminderId === policy.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleSendEmailReminder(policy);
                            }}
                          >
                            {sendingReminderId === policy.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Mail className="mr-1 h-3 w-3" />
                            )}
                            Send Reminder
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between"
            >
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}—
                {Math.min(currentPage * PAGE_SIZE, filteredPolicies.length)} of{" "}
                {filteredPolicies.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-foreground/85">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </motion.div>

      {/* Dialogs */}
      <PolicyForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSuccess={() => { void mutate(); }}
      />
      {isAdminOrManager && (
        <>
          <BulkImport
            open={showBulkImport}
            onOpenChange={setShowBulkImport}
            onSuccess={() => { void mutate(); }}
          />
        </>
      )}

      {/* Delete Policy Confirmation */}
      <AlertDialog open={!!deleteTargetPolicy} onOpenChange={(open) => !open && setDeleteTargetPolicy(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Policy</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete policy <strong className="text-foreground">{deleteTargetPolicy?.policy_number}</strong>? This will also remove all related premiums, commissions, renewals, and documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-strong text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!!deletingPolicyId}
              onClick={async () => {
                if (!deleteTargetPolicy || !user) return;
                setDeletingPolicyId(deleteTargetPolicy.id);
                try {
                  const cascade = await policyService.deleteWithCascade(deleteTargetPolicy.id);
                  const parts = [
                    cascade.deletedPremiums && `${cascade.deletedPremiums} premium(s)`,
                    cascade.deletedCommissions && `${cascade.deletedCommissions} commission(s)`,
                    cascade.deletedRenewals && `${cascade.deletedRenewals} renewal(s)`,
                    cascade.deletedDocuments && `${cascade.deletedDocuments} document(s)`,
                  ].filter(Boolean);
                  const cascadeMsg = parts.length ? ` — also removed ${parts.join(", ")}` : "";
                  toast.success(`Policy deleted${cascadeMsg}`);
                  invalidatePolicies();
                  void mutate();
                  auditLogService.logAction(
                    user.uid, user.name || "", "delete", "policies",
                    `Deleted policy ${deleteTargetPolicy.id} (${deleteTargetPolicy.policy_number})${cascadeMsg}`
                  ).catch(() => {});
                } catch {
                  toast.error("Failed to delete policy");
                } finally {
                  setDeletingPolicyId(null);
                  setDeleteTargetPolicy(null);
                }
              }}
            >
              {deletingPolicyId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
