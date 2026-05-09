"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { FileText, Plus, Minus } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface EndorsementHistoryProps {
  customerId: string;
}

async function fetchEndorsements(customerId: string, token: string) {
  const res = await fetch(`/api/gmc/${customerId}/endorsements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { data: [] };
  return res.json();
}

export function GMCEndorsementHistory({ customerId }: EndorsementHistoryProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const { data, isLoading } = useSWR(
    token ? `gmc-endorsements-${customerId}` : null,
    () => fetchEndorsements(customerId, token),
    { revalidateOnFocus: false }
  );

  const endorsements = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Endorsement History</h3>
        <Badge variant="secondary" className="text-xs">{endorsements.length}</Badge>
      </div>

      {endorsements.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No endorsements yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Endorsement #</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Member Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Employee ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endorsements.map((e: any) => (
                <TableRow key={e.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">{e.endorsement_number}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs gap-1 ${
                        e.endorsement_type === "Addition"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {e.endorsement_type === "Addition"
                        ? <Plus className="w-3 h-3" />
                        : <Minus className="w-3 h-3" />
                      }
                      {e.endorsement_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {e.endorsement_date ? format(new Date(e.endorsement_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.member_details?.name || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-sm text-muted-foreground">
                    {e.member_details?.employee_id || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
