"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import useSWR from "swr";
import { format } from "date-fns";
import {
  FileSpreadsheet, Plus, CheckCircle2, AlertTriangle, Clock, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function CommissionReconciliationPage() {
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const { data, isLoading } = useSWR(
    token ? [`/api/reconciliation?limit=50`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const runs = data?.data ?? [];

  // Summary metrics
  const total = runs.length;
  const pending = runs.filter((r: any) => r.status === "pending" || r.status === "processing").length;
  const completed = runs.filter((r: any) => r.status === "completed").length;
  const totalDiscrepancies = runs.reduce((s: number, r: any) => s + (r.discrepancy_count ?? 0), 0);

  const metrics = [
    { label: "Total Runs", value: total, icon: FileSpreadsheet, color: "text-foreground" },
    { label: "Pending", value: pending, icon: Clock, color: "text-amber-400" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-green-400" },
    { label: "Total Discrepancies", value: totalDiscrepancies, icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Commission Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import and reconcile insurer commission statements
          </p>
        </div>
        {(role === "admin" || role === "manager") && (
          <Button
            size="sm"
            onClick={() => router.push("/dashboard/commission-reconciliation/new")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Import Statement
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Runs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No reconciliation runs yet.</p>
            {(role === "admin" || role === "manager") && (
              <Button
                onClick={() => router.push("/dashboard/commission-reconciliation/new")}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Import First Statement
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Insurer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Period</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">File</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Records</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Matched</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Discrepancies</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run: any) => (
                <TableRow
                  key={run.id}
                  className="border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/dashboard/commission-reconciliation/${run.id}`)}
                >
                  <TableCell className="font-medium text-sm">{run.insurer_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {run.statement_period_start} – {run.statement_period_end}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[150px]">
                    {run.file_name}
                  </TableCell>
                  <TableCell className="text-sm">{run.total_records ?? 0}</TableCell>
                  <TableCell>
                    <span className="text-green-400 font-medium">{run.matched_count ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className={run.discrepancy_count > 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
                      {run.discrepancy_count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${STATUS_COLORS[run.status] ?? ""}`}
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {run.created_at ? format(new Date(run.created_at), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/commission-reconciliation/${run.id}`);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  );
}
