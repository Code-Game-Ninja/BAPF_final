"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle,
  Calendar,
  Clock,
  CalendarClock,
  Shield,
  Search,
  Download,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { usePolicies } from "@/lib/hooks/use-policies";
import { useAuth } from "@/lib/context/auth-context";
import { renewalService } from "@/lib/services/renewal.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import {
  ExpiryBucket,
  EXPIRY_BUCKETS,
  groupPoliciesByExpiryBucket,
  getDaysUntilExpiry,
  formatPolicyForExport,
} from "@/lib/helpers/policy";
import { exportToCSV, exportToExcel } from "@/lib/helpers/export-report";
import { staggerContainer, staggerItem } from "@/lib/helpers/animations";
import type { Policy } from "@/lib/types";
import { EmptyState } from "@/components/global/empty-state";

const PAGE_SIZE = 20;

const BUCKET_ICONS: Record<ExpiryBucket, React.ElementType> = {
  expired: AlertTriangle,
  next7days: Clock,
  next30days: Calendar,
  next90days: CalendarClock,
  beyond90days: Shield,
};

export default function PolicyExpiryPage() {
  const router = useRouter();
  const { user: dbUser } = useAuth();
  const { data: policies, isLoading } = usePolicies();

  const [activeTab, setActiveTab] = useState<ExpiryBucket>("expired");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  // Employee sees only their assigned policies
  const isEmployee = dbUser?.role === "employee";
  const visiblePolicies = useMemo(() => {
    if (!policies) return null;
    if (isEmployee && dbUser) {
      return policies.filter((p) => p.assigned_to === dbUser.uid);
    }
    return policies;
  }, [policies, isEmployee, dbUser]);
  const isPoliciesLoading = isLoading && !visiblePolicies;

  // Group policies by expiry bucket
  const bucketGroups = useMemo(() => {
    if (!visiblePolicies) return null;
    return groupPoliciesByExpiryBucket(visiblePolicies);
  }, [visiblePolicies]);

  // Filtered policies for active tab
  const filteredPolicies = useMemo(() => {
    if (!bucketGroups) return [];
    let list = bucketGroups[activeTab];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.policy_number.toLowerCase().includes(q) ||
          p.customer_name.toLowerCase().includes(q) ||
          (p.insurer_name || "").toLowerCase().includes(q) ||
          p.policy_type.toLowerCase().includes(q)
      );
    }

    return list;
  }, [bucketGroups, activeTab, search]);

  // Pagination
  const totalPages = Math.ceil(filteredPolicies.length / PAGE_SIZE);
  const paginatedPolicies = filteredPolicies.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Reset page when tab or search changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ExpiryBucket);
    setPage(1);
  };

  // Create renewal record (only admin/manager can create)
  const handleRenew = useCallback(
    async (policy: Policy) => {
      if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "manager")) return;
      setRenewingId(policy.id);
      try {
        await renewalService.createFromPolicy(policy, dbUser.id);
        toast.success("Renewal created", {
          description: `Renewal record created for ${policy.policy_number}`,
        });
        auditLogService.logAction(
          dbUser.uid || dbUser.id, dbUser.name || "", "create", "renewals",
          `Created renewal from expiring policy ${policy.policy_number}`
        ).catch(() => {});
        router.push("/dashboard/renewals");
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to create renewal";
        if (msg.includes("already exists")) {
          toast.info("Renewal already exists", {
            description: "A renewal record already exists for this policy.",
          });
        } else {
          toast.error("Failed to create renewal", { description: msg });
        }
      } finally {
        setRenewingId(null);
      }
    },
    [dbUser, router]
  );

  // Export current tab 
  const handleExport = async (format: "csv" | "xlsx") => {
    const data = filteredPolicies.map(formatPolicyForExport);
    const bucketInfo = EXPIRY_BUCKETS.find((b) => b.key === activeTab)!;
    const filename = `policy-expiry-${activeTab}-${new Date().toISOString().split("T")[0]}`;

    const columns = Object.keys(data[0] || {}).map((key) => ({
      header: key,
      key,
    }));

    if (format === "csv") {
      exportToCSV(data as Record<string, unknown>[], columns, filename);
    } else {
      await exportToExcel(data as Record<string, unknown>[], columns, filename);
    }
    toast.success(`Exported ${filteredPolicies.length} ${bucketInfo.label} policies`);
  };

  const formatDate = (ts: unknown) => {
    const maybeTimestamp = ts as { toDate?: () => Date };
    const raw =
      typeof ts === "object" &&
      ts !== null &&
      typeof maybeTimestamp.toDate === "function"
        ? maybeTimestamp.toDate()
        : ts;
    const d = raw instanceof Date ? raw : new Date(raw as string | number);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider">
            Policy Expiry View
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage expiring policies by time bucket
          </p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {EXPIRY_BUCKETS.map((bucket) => {
          const Icon = BUCKET_ICONS[bucket.key];
          const count = bucketGroups?.[bucket.key]?.length ?? 0;
          const isActive = activeTab === bucket.key;

          return (
            <Card
              key={bucket.key}
              className={`cursor-pointer transition-all duration-200 ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              }`}
              onClick={() => handleTabChange(bucket.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${bucket.color}20` }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: bucket.color }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
                      {bucket.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground font-heading">
                      {count}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Active Tab Content */}
      <motion.div variants={staggerItem}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <TabsList className="bg-background border border-muted-foreground/20">
              {EXPIRY_BUCKETS.map((b) => (
                <TabsTrigger
                  key={b.key}
                  value={b.key}
                  className="text-xs uppercase font-heading data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  {b.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 w-48 bg-primary-foreground border-muted-foreground/30 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              {filteredPolicies.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("csv")}
                    className="border-muted-foreground/30 text-foreground/70 hover:bg-primary/10"
                  >
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("xlsx")}
                    className="border-muted-foreground/30 text-foreground/70 hover:bg-primary/10"
                  >
                    <Download className="w-4 h-4 mr-1" /> Excel
                  </Button>
                </>
              )}
            </div>
          </div>

          {EXPIRY_BUCKETS.map((bucket) => (
            <TabsContent key={bucket.key} value={bucket.key}>
              {isPoliciesLoading ? (
                <Card className="border-border-strong/60 bg-card/90">
                  <CardContent className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading policies...
                  </CardContent>
                </Card>
              ) : filteredPolicies.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={`No ${bucket.label} Policies`}
                  description={
                    search
                      ? "No policies match your search in this category."
                      : `No policies in the "${bucket.label}" category.`
                  }
                />
              ) : (
                <>
                  <div className="rounded-lg border border-muted-foreground/20 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-muted-foreground/20 hover:bg-transparent">
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading">Policy #</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading">Customer</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading hidden md:table-cell">Type</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading hidden lg:table-cell">Insurer</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading">End Date</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading">Days</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading hidden lg:table-cell">Premium</TableHead>
                          <TableHead className="text-muted-foreground uppercase text-xs font-heading text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPolicies.map((policy) => {
                          const days = getDaysUntilExpiry(policy.end_date);
                          return (
                            <TableRow
                              key={policy.id}
                              className="border-muted-foreground/10 hover:bg-muted-foreground/5 cursor-pointer"
                              onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                            >
                              <TableCell className="font-heading text-foreground font-medium">
                                {policy.policy_number}
                              </TableCell>
                              <TableCell className="text-foreground/80">
                                {policy.customer_name}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="text-xs border-muted-foreground/30 text-foreground/70">
                                  {policy.policy_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground/70 hidden lg:table-cell">
                                {policy.insurer_name || "-"}
                              </TableCell>
                              <TableCell className="text-foreground/80">
                                {formatDate(policy.end_date)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={bucket.badgeVariant}
                                  className="text-xs"
                                >
                                  {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-primary font-heading">
                                  <IndianRupee className="w-3 h-3 inline mr-0.5" />
                                  {formatCurrency(policy.premium_amount || 0).replace('₹', '')}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                                    className="text-foreground/60 hover:text-primary"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {!isEmployee && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRenew(policy)}
                                      disabled={renewingId === policy.id}
                                      className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                                    >
                                      {renewingId === policy.id ? (
                                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                      )}
                                      Renew
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-muted-foreground">
                        Showing {(page - 1) * PAGE_SIZE + 1}—{Math.min(page * PAGE_SIZE, filteredPolicies.length)} of {filteredPolicies.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                          className="border-muted-foreground/30"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-foreground font-heading">
                          {page} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === totalPages}
                          onClick={() => setPage(page + 1)}
                          className="border-muted-foreground/30"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
