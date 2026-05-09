"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Shield, MoreHorizontal, Eye } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { FleetClaimForm } from "@/components/fleet/FleetClaimForm";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-500/10 text-blue-400",
  surveyor_appointed: "bg-purple-500/10 text-purple-400",
  assessment_done: "bg-amber-500/10 text-amber-400",
  approved: "bg-green-500/10 text-green-400",
  settled: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
};

async function fetchClaims(customerId: string, token: string) {
  const res = await fetch(`/api/fleet/${customerId}/claims`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch claims");
  return res.json();
}

export default function FleetClaimsPage() {
  const params = useParams();
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";
  const customerId = params.customerId as string;

  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    token ? `fleet-claims-${customerId}` : null,
    () => fetchClaims(customerId, token),
    { revalidateOnFocus: false }
  );

  const claims = data?.data ?? [];
  const canEdit = role === "admin" || role === "manager";

  return (
    <motion.div {...pageTransition} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/fleet/${customerId}/vehicles`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Fleet Claims
            </h1>
            <p className="text-sm text-muted-foreground">{claims.length} claims</p>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Claim
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Shield className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No claims registered yet.</p>
            {canEdit && (
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Register First Claim
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Claim Number</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Vehicle</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Surveyor</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((c: any) => (
                <TableRow
                  key={c.id}
                  className="border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/dashboard/claims/${c.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">{c.claim_number}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {c.customer_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {c.claim_amount ? `₹${Number(c.claim_amount).toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>
                      {c.status?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {c.surveyor_name || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {c.claim_date ? format(new Date(c.claim_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/claims/${c.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> View Detail
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <FleetClaimForm
        open={addOpen}
        onOpenChange={setAddOpen}
        customerId={customerId}
        onSuccess={() => mutate()}
      />
    </motion.div>
  );
}
