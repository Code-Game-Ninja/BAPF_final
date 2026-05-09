"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, AlertTriangle, Clock, CheckCircle, Filter } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const DOC_TYPE_LABELS: Record<string, string> = {
  permit_state: "Permit (State)",
  permit_national: "Permit (National)",
  fitness: "Fitness",
  puc: "PUC",
  rc: "RC",
  tax_state: "Tax (State)",
  tax_national: "Tax (National)",
};

function getRowColor(daysLeft: number): string {
  if (daysLeft < 0) return "bg-red-500/5 border-l-2 border-l-red-500";
  if (daysLeft <= 7) return "bg-orange-500/5 border-l-2 border-l-orange-500";
  if (daysLeft <= 15) return "bg-yellow-500/5 border-l-2 border-l-yellow-500";
  return "bg-amber-500/5 border-l-2 border-l-amber-400";
}

async function fetchValidity(customerId: string, token: string, params: string) {
  const res = await fetch(`/api/fleet/${customerId}/validity?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch validity data");
  return res.json();
}

export default function FleetValidityPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const customerId = params.customerId as string;

  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const queryParams = new URLSearchParams({
    document_type: docTypeFilter,
    vehicle_category: categoryFilter,
  }).toString();

  const { data, isLoading } = useSWR(
    token ? `fleet-validity-${customerId}-${queryParams}` : null,
    () => fetchValidity(customerId, token, queryParams),
    { revalidateOnFocus: false }
  );

  const validityDocs = data?.data ?? [];
  const summary = data?.summary ?? { expired: 0, expiring_7: 0, expiring_15: 0, expiring_30: 0 };

  return (
    <motion.div {...pageTransition} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/fleet/${customerId}/vehicles`)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-heading font-bold uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Validity Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Track expiring vehicle documents</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Expired", value: summary.expired, color: "text-red-400", bg: "bg-red-500/10", icon: AlertTriangle },
          { label: "≤ 7 Days", value: summary.expiring_7, color: "text-orange-400", bg: "bg-orange-500/10", icon: AlertTriangle },
          { label: "≤ 15 Days", value: summary.expiring_15, color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Clock },
          { label: "≤ 30 Days", value: summary.expiring_30, color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Document Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Document Types</SelectItem>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            <SelectItem value="Two-wheeler">Two-wheeler</SelectItem>
            <SelectItem value="Four-wheeler">Four-wheeler</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : validityDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle className="w-10 h-10 text-green-400/40" />
            <p className="text-muted-foreground text-sm">No expiring documents in the next 30 days.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Registration #</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Make / Model</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Document Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Expiry Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Days Remaining</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validityDocs.map((doc: any) => (
                <TableRow key={doc.id} className={`border-border ${getRowColor(doc.days_remaining)}`}>
                  <TableCell className="font-mono text-sm font-medium">
                    {doc.vehicle?.registration_number || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {doc.vehicle ? `${doc.vehicle.make} ${doc.vehicle.model}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                  </TableCell>
                  <TableCell className="text-sm">
                    {doc.expiry_date ? format(new Date(doc.expiry_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-bold ${
                      doc.days_remaining < 0 ? "text-red-400"
                      : doc.days_remaining <= 7 ? "text-orange-400"
                      : doc.days_remaining <= 15 ? "text-yellow-400"
                      : "text-amber-400"
                    }`}>
                      {doc.days_remaining < 0 ? `${Math.abs(doc.days_remaining)}d overdue` : `${doc.days_remaining}d`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${
                      doc.status === "expired" ? "bg-red-500/10 text-red-400"
                      : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {doc.status?.replace(/_/g, " ")}
                    </Badge>
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
