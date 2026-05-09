"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink,
  AlertTriangle, ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SLACountdown } from "./SLACountdown";
import { Checkbox } from "@/components/ui/checkbox";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  resolved: "bg-green-500/10 text-green-400 border-green-500/20",
  closed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  ecard_request: "E-Card",
  member_endorsement: "Endorsement",
  name_correction: "Name Correction",
  address_correction: "Address",
  invoice_dispute: "Invoice",
  claim_assistance: "Claim",
  general_query: "General",
  validity_renewal: "Validity",
  vehicle_endorsement: "Vehicle",
  policy_query: "Policy",
  document_request: "Document",
};

interface Ticket {
  id: string;
  ticket_number: string;
  category: string;
  priority: string;
  status: string;
  sla_deadline?: string;
  created_at: string;
  is_breached?: boolean;
  escalation_level?: number;
  sla_paused_at?: string;
  customers?: { name: string } | null;
  owner?: { name: string } | null;
}

interface SortConfig {
  field: string;
  order: "asc" | "desc";
}

interface TicketListTableProps {
  tickets: Ticket[];
  isLoading?: boolean;
  sort: SortConfig;
  onSortChange: (field: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showBulkActions?: boolean;
}

function SortIcon({ field, sort }: { field: string; sort: SortConfig }) {
  if (sort.field !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return sort.order === "asc"
    ? <ArrowUp className="w-3 h-3 text-primary" />
    : <ArrowDown className="w-3 h-3 text-primary" />;
}

function SortableHeader({ field, label, sort, onSortChange }: { field: string; label: string; sort: SortConfig; onSortChange: (field: string) => void }) {
  return (
    <button
      onClick={() => onSortChange(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <SortIcon field={field} sort={sort} />
    </button>
  );
}

export function TicketListTable({
  tickets,
  isLoading,
  sort,
  onSortChange,
  selectedIds = [],
  onSelectionChange,
  showBulkActions = false,
}: TicketListTableProps) {
  const router = useRouter();

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === tickets.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tickets.map(t => t.id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">No tickets found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          {showBulkActions && (
            <TableHead className="w-10">
              <Checkbox
                checked={selectedIds.length === tickets.length && tickets.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
          )}
          <TableHead className="text-xs uppercase tracking-wider font-heading">Ticket #</TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">
            <SortableHeader field="customer_name" label="Customer" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">Category</TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading">
            <SortableHeader field="priority" label="Priority" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading">
            <SortableHeader field="sla_deadline" label="SLA" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading hidden xl:table-cell">Assigned To</TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">
            <SortableHeader field="created_at" label="Created" sort={sort} onSortChange={onSortChange} />
          </TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map(ticket => {
          const isPaused = ticket.status === "pending";
          const isSelected = selectedIds.includes(ticket.id);

          return (
            <TableRow
              key={ticket.id}
              className={`border-border hover:bg-muted/30 cursor-pointer transition-colors ${
                isSelected ? "bg-primary/5" : ""
              }`}
              onClick={() => router.push(`/dashboard/service-desk/${ticket.id}`)}
            >
              {showBulkActions && (
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(ticket.id)}
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-primary">
                    {ticket.ticket_number}
                  </span>
                  {(ticket.escalation_level ?? 0) > 0 && (
                    <Badge className="bg-red-500/10 text-red-400 text-xs px-1 py-0">
                      <ChevronUp className="w-3 h-3" />
                      L{ticket.escalation_level}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {(ticket.customers as { name: string } | null)?.name ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${PRIORITY_COLORS[ticket.priority] ?? ""}`}
                >
                  {ticket.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[ticket.status] ?? ""}`}
                >
                  {ticket.status?.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <SLACountdown
                  createdAt={ticket.created_at}
                  slaDeadline={ticket.sla_deadline}
                  isPaused={isPaused}
                  isBreached={ticket.is_breached}
                  compact
                />
              </TableCell>
              <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                {(ticket.owner as { name: string } | null)?.name ?? "Unassigned"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                {format(new Date(ticket.created_at), "dd MMM yyyy")}
              </TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => router.push(`/dashboard/service-desk/${ticket.id}`)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
