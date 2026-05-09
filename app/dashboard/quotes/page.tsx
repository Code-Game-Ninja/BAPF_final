"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { FileText, Plus, Search, X } from "lucide-react";
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

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  quotes_received: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  converted: "bg-green-500/10 text-green-400 border-green-500/20",
  expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function QuotesPage() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  params.set("limit", "50");

  const { data, isLoading } = useSWR(
    token ? [`/api/quotes?${params}`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const requests = (data?.data ?? []).filter((r: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.quote_request_number?.toLowerCase().includes(q) ||
      r.customers?.name?.toLowerCase().includes(q) ||
      r.policy_type?.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Quote Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage multi-insurer quote comparisons
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/dashboard/quotes/new")} className="gap-2">
          <Plus className="w-4 h-4" /> New Quote Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by QR#, customer, policy type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="quotes_received">Quotes Received</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No quote requests yet.</p>
            <Button onClick={() => router.push("/dashboard/quotes/new")} className="gap-2">
              <Plus className="w-4 h-4" /> Create First Quote Request
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">QR #</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Policy Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">Insurers</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Quotes</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r: any) => (
                <TableRow
                  key={r.id}
                  className="border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/dashboard/quotes/${r.id}`)}
                >
                  <TableCell className="font-mono text-xs text-primary">
                    {r.quote_request_number}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{r.customers?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.customers?.phone ?? ""}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs capitalize">
                    {r.policy_type?.replace(/_/g, " ") ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {(r.target_insurers ?? []).slice(0, 2).join(", ")}
                    {(r.target_insurers ?? []).length > 2 && ` +${r.target_insurers.length - 2}`}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {(r.quotes ?? []).length} quotes
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${STATUS_COLORS[r.status] ?? ""}`}
                    >
                      {r.status?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/quotes/${r.id}`);
                      }}
                    >
                      Compare
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
