"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { archiveService } from "@/lib/services/campaign.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import {
  useArchives,
  useArchivedPolicies,
  useCancelledPolicies,
  useExpiredPolicies,
  useArchiveStats,
  invalidateArchives,
} from "@/lib/hooks/use-campaigns";
import {
  getArchiveStatusConfig,
} from "@/lib/validations/campaign";
import {
  Archive,
  Search,
  Loader2,
  RotateCcw,
  FileX,
  XCircle,
  AlertTriangle,
  Hash,
  Sparkles,
} from "lucide-react";
import { Policy } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

export default function ArchivesPage() {
  const { user: dbUser } = useAuth();
  const router = useRouter();
  const isAdminOrManager =
    dbUser?.role === "admin" || dbUser?.role === "manager";
  const { data: allInactive, isLoading: loadingAll } = useArchives();
  const { data: archived, isLoading: loadingArchived } = useArchivedPolicies();
  const { data: cancelled, isLoading: loadingCancelled } =
    useCancelledPolicies();
  const { data: expired, isLoading: loadingExpired } = useExpiredPolicies();
  const { data: stats } = useArchiveStats();

  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    if (!isAdminOrManager) {
      toast.error("Only admins and managers can restore policies");
      return;
    }
    setRestoringId(id);
    try {
      await archiveService.restorePolicy(id);
      toast.success("Policy restored to active");
      invalidateArchives();
      if (dbUser) {
        auditLogService.logAction(
          dbUser.uid || dbUser.id, dbUser.name || "", "update", "archives",
          `Restored policy ${id} to active status`
        ).catch(() => {});
      }
    } catch {
      toast.error("Failed to restore policy");
    } finally {
      setRestoringId(null);
    }
  };

  const filterPolicies = (list: Policy[] | undefined) => {
    if (!list) return [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.policy_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.policy_type.toLowerCase().includes(q) ||
        (p.insurer_name || "").toLowerCase().includes(q),
    );
  };

  const currentData =
    tab === "all"
      ? allInactive
      : tab === "archived"
        ? archived
        : tab === "cancelled"
          ? cancelled
          : expired;

  const currentLoading =
    tab === "all"
      ? loadingAll
      : tab === "archived"
        ? loadingArchived
        : tab === "cancelled"
          ? loadingCancelled
          : loadingExpired;

  const filteredData = filterPolicies(currentData);

  return (
    <>
      <motion.div className="space-y-6" {...pageTransition}>
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Recovery center
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Archives
            </h1>
            <p className="text-sm text-muted-foreground">
              View archived, cancelled, and expired policies with controlled restoration.
            </p>
          </div>
          <motion.div {...hoverLift}>
            <ExportButton
              data={filteredData.map((p) => ({
                policy_number: p.policy_number,
                customer_name: p.customer_name,
                policy_type: p.policy_type,
                insurer_name: p.insurer_name || "",
                status: p.status,
                end_date: p.end_date ? new Date(p.end_date).toLocaleDateString("en-IN") : "",
              }))}
              filename="archives"
              columns={{
                policy_number: "Policy #",
                customer_name: "Customer",
                policy_type: "Type",
                insurer_name: "Insurer",
                status: "Status",
                end_date: "End Date",
              }}
            />
          </motion.div>
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
              { icon: Hash, label: "Total Inactive", value: stats.total, panel: "border-blue-500/30 bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
              { icon: Archive, label: "Archived", value: stats.archived, panel: "border-indigo-500/30 bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300" },
              { icon: XCircle, label: "Cancelled", value: stats.cancelled, panel: "border-red-500/30 bg-red-500/10", text: "text-red-700 dark:text-red-300" },
              { icon: AlertTriangle, label: "Expired", value: stats.expired, panel: "border-amber-500/30 bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
            ].map((item) => (
              <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
                <Card className={item.panel}>
                  <CardContent className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                        <p className={`mt-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
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

        {/* Tabs + Search */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <TabsList className="border border-border/80 bg-card/80 p-1">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
              >
                All ({stats?.total || 0})
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
              >
                Archived ({stats?.archived || 0})
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
              >
                Cancelled ({stats?.cancelled || 0})
              </TabsTrigger>
              <TabsTrigger
                value="expired"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
              >
                Expired ({stats?.expired || 0})
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-70">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/80 border-border/80 text-foreground"
              />
            </div>
          </div>

          {/* Content (same table for all tabs) */}
          {["all", "archived", "cancelled", "expired"].map((t) => (
            <TabsContent key={t} value={t}>
              <PolicyArchiveTable
                policies={filteredData}
                isLoading={currentLoading}
                onRestore={setRestoreTarget}
                restoringId={restoringId}
                isAdminOrManager={isAdminOrManager}
                onRowClick={(id) => router.push(`/dashboard/policies/${id}`)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Restore Policy
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to restore this policy to active status?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                if (restoreTarget) handleRestore(restoreTarget);
                setRestoreTarget(null);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- Archive Table ----

function PolicyArchiveTable({
  policies,
  isLoading,
  onRestore,
  restoringId,
  isAdminOrManager,
  onRowClick,
}: {
  policies: Policy[];
  isLoading: boolean;
  onRestore: (id: string) => void;
  restoringId: string | null;
  isAdminOrManager: boolean;
  onRowClick: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <Card className="border-border-strong/70 bg-card/95">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (policies.length === 0) {
    return (
      <Card className="border-border-strong/70 bg-card/95">
        <CardContent className="text-center py-16">
          <FileX className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No policies found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/80 bg-muted/20 hover:bg-muted/20">
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Policy #</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Customer</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Type</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Insurer</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">End Date</TableHead>
              {isAdminOrManager && (
                <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Action
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((p) => {
              const stCfg = getArchiveStatusConfig(p.status);
              return (
                <TableRow
                  key={p.id}
                  className="cursor-pointer border-border/70 hover:bg-muted/35"
                  onClick={() => onRowClick(p.id)}
                >
                  <TableCell className="text-foreground font-medium font-mono text-sm">
                    {p.policy_number}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {p.customer_name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-border text-foreground"
                    >
                      {p.policy_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.insurer_name || "—"}
                  </TableCell>
                  <TableCell>
                    {stCfg ? (
                      <Badge
                        style={{
                          backgroundColor: stCfg.color + "20",
                          color: stCfg.color,
                          borderColor: stCfg.color + "40",
                        }}
                        variant="outline"
                      >
                        {stCfg.label}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-border-strong text-foreground"
                      >
                        {p.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.end_date
                      ? new Date(p.end_date).toLocaleDateString("en-IN")
                      : "—"}
                  </TableCell>
                  {isAdminOrManager && (
                    <TableCell className="text-right">
                      {(p.status === "archived" ||
                        p.status === "cancelled") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/90 hover:bg-primary/10"
                          disabled={restoringId === p.id}
                          onClick={(e) => { e.stopPropagation(); onRestore(p.id); }}
                        >
                          {restoringId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          )}
                          Restore
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
