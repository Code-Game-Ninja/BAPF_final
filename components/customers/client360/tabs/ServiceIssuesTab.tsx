"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, Plus, ExternalLink, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CreateTicketDialog } from "@/components/service-desk/CreateTicketDialog";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  pending: "bg-orange-500/10 text-orange-400",
  resolved: "bg-green-500/10 text-green-400",
  closed: "bg-gray-500/10 text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-amber-500/10 text-amber-400",
  low: "bg-gray-500/10 text-gray-400",
};

async function fetchTickets(customerId: string) {
  const { data, error } = await supabase
    .from("service_tickets")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export function ServiceIssuesTab({ customerId, customerName }: { customerId: string; customerName?: string }) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: tickets, isLoading, mutate } = useSWR(
    `tickets-${customerId}`,
    () => fetchTickets(customerId),
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  const open = (tickets ?? []).filter((t: any) => t.status === "open" || t.status === "in_progress").length;
  const overdue = (tickets ?? []).filter((t: any) => {
    if (!t.sla_deadline) return false;
    return new Date(t.sla_deadline) < new Date() && t.status !== "resolved" && t.status !== "closed";
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Service Issues</h3>
          <Badge variant="secondary" className="text-xs">{tickets?.length ?? 0}</Badge>
        </div>
        <Button size="sm" variant="outline"
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open", value: open, color: "text-blue-400" },
          { label: "Overdue", value: overdue, color: overdue > 0 ? "text-red-400" : "text-muted-foreground" },
          { label: "Total", value: tickets?.length ?? 0, color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {!tickets || tickets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No service tickets yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t: any) => {
            const isOverdue = t.sla_deadline && new Date(t.sla_deadline) < new Date()
              && t.status !== "resolved" && t.status !== "closed";
            return (
              <button
                key={t.id}
                onClick={() => router.push(`/dashboard/service-desk/${t.id}`)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{t.ticket_number || "—"}</p>
                    {isOverdue && <Badge className="bg-red-500/10 text-red-400 text-xs">Overdue</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.category?.replace(/_/g, " ") || "—"}
                    {t.created_at && ` · ${format(new Date(t.created_at), "dd MMM yyyy")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[t.priority] || ""}`}>
                    {t.priority}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[t.status] || ""}`}>
                    {t.status?.replace(/_/g, " ")}
                  </Badge>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={open => {
          setCreateDialogOpen(open);
          if (!open) mutate(); // Refresh tickets after creation
        }}
        prefillCustomerId={customerId}
        prefillCustomerName={customerName}
      />
    </div>
  );
}
