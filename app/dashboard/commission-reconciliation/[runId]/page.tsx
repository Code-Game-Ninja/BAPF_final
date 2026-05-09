"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft, Download, CheckCircle2, AlertTriangle, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { DiscrepancyResolutionDialog } from "@/components/reconciliation/DiscrepancyResolutionDialog";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const RESOLUTION_COLORS: Record<string, string> = {
  unresolved: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  accept_statement: "bg-green-500/10 text-green-400 border-green-500/20",
  accept_crm: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  escalated: "bg-red-500/10 text-red-400 border-red-500/20",
};

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function ReconciliationRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [discrepancyTypeFilter, setDiscrepancyTypeFilter] = useState("all");
  const [resolutionFilter, setResolutionFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryParams = new URLSearchParams();
  if (discrepancyTypeFilter !== "all") queryParams.set("discrepancy_type", discrepancyTypeFilter);
  if (resolutionFilter !== "all") queryParams.set("resolution_status", resolutionFilter);

  const { data: run, isLoading, mutate } = useSWR(
    token ? [`/api/reconciliation/${runId}?${queryParams}`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const handleDownloadReport = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/reconciliation/${runId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reconciliation-${runId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Run not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const records = run.records ?? [];
  const discrepancies = records.filter((r: any) => r.match_status === "discrepancy");
  const matched = records.filter((r: any) => r.match_status === "matched");
  const unresolved = discrepancies.filter((r: any) => r.resolution_status === "unresolved");

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold uppercase tracking-wider">
              {run.insurer_name}
            </h1>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${STATUS_COLORS[run.status] ?? ""}`}
            >
              {run.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {run.statement_period_start} – {run.statement_period_end} · {run.file_name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadReport} className="gap-2">
          <Download className="w-4 h-4" /> Download Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: run.total_records ?? 0, color: "text-foreground" },
          { label: "Matched", value: run.matched_count ?? 0, color: "text-green-400" },
          { label: "Discrepancies", value: run.discrepancy_count ?? 0, color: "text-red-400" },
          { label: "Unresolved", value: unresolved.length, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Discrepancy Table */}
      {discrepancies.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Discrepancies ({discrepancies.length})
            </h2>
            <div className="flex gap-2">
              <Select value={discrepancyTypeFilter} onValueChange={setDiscrepancyTypeFilter}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="amount_mismatch">Amount Mismatch</SelectItem>
                  <SelectItem value="policy_not_found">Policy Not Found</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="missing_in_statement">Missing in Statement</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resolutionFilter} onValueChange={setResolutionFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                  <SelectItem value="accept_statement">Accepted Statement</SelectItem>
                  <SelectItem value="accept_crm">Accepted CRM</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Policy #</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">CRM Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Statement Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Difference</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Resolution</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discrepancies.map((record: any) => (
                <TableRow key={record.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{record.policy_number ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {record.discrepancy_type?.replace(/_/g, " ") ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {record.crm_commission != null
                      ? `₹${record.crm_commission.toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {record.statement_commission != null
                      ? `₹${record.statement_commission.toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-red-400">
                    {record.discrepancy_amount != null
                      ? `₹${record.discrepancy_amount.toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${RESOLUTION_COLORS[record.resolution_status] ?? ""}`}
                    >
                      {record.resolution_status?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {record.resolution_status === "unresolved" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedRecord(record);
                          setDialogOpen(true);
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Matched Records */}
      {matched.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Matched Records ({matched.length})
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Policy #</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">CRM Commission</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Statement Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matched.slice(0, 20).map((record: any) => (
                <TableRow key={record.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{record.policy_number ?? "—"}</TableCell>
                  <TableCell className="text-xs text-green-400">
                    {record.crm_commission != null
                      ? `₹${record.crm_commission.toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {record.statement_commission != null
                      ? `₹${record.statement_commission.toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {matched.length > 20 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-3">
                    +{matched.length - 20} more matched records
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <DiscrepancyResolutionDialog
        runId={runId}
        record={selectedRecord}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onResolved={() => mutate()}
      />
    </motion.div>
  );
}
