"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, UserCheck, ChevronUp, Plus, Upload,
  ExternalLink, Building2, FileText,
} from "lucide-react";
import useSWR from "swr";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TicketHeader } from "./TicketHeader";
import { StatusTimeline } from "./StatusTimeline";
import { NotesSection } from "./NotesSection";
import { ActivityLogSection } from "./ActivityLogSection";
import { DocumentAttachments } from "./DocumentAttachments";
import { EscalationDialog } from "./EscalationDialog";
import { AssignOwnerDialog } from "./AssignOwnerDialog";

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress"],
  in_progress: ["pending", "resolved"],
  pending: ["in_progress"],
  resolved: ["closed"],
  closed: [],
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

async function fetchTicket(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch ticket");
  return res.json();
}

interface TicketDetailViewProps {
  ticketId: string;
}

export function TicketDetailView({ ticketId }: TicketDetailViewProps) {
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const [escalateOpen, setEscalateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { data: ticket, isLoading, mutate } = useSWR(
    token ? `/api/service-desk/tickets/${ticketId}` : null,
    (url: string) => fetchTicket(url, token),
    { revalidateOnFocus: false }
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!token || !ticket) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      mutate();
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button onClick={() => router.push("/dashboard/service-desk")}>
          Back to Service Desk
        </Button>
      </div>
    );
  }

  const allowedTransitions = VALID_TRANSITIONS[ticket.status as string] ?? [];
  const canEscalate = ticket.status !== "resolved" && ticket.status !== "closed" &&
    (ticket.escalation_level ?? 0) < 2;
  const canAssign = role === "admin" || role === "manager";

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/service-desk")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Service Desk
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutate()}
          className="gap-2 ml-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Ticket header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <TicketHeader
          ticketNumber={ticket.ticket_number}
          category={ticket.category}
          priority={ticket.priority}
          status={ticket.status}
          createdAt={ticket.created_at}
          slaDeadline={ticket.sla_deadline}
          isBreached={ticket.is_breached}
          escalationLevel={ticket.escalation_level}
          ownerName={(ticket.owner as { name: string } | null)?.name}
        />
      </div>

      {/* Status timeline */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-4">
          Status Timeline
        </h3>
        <StatusTimeline currentStatus={ticket.status} />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-3">
              Description
            </h3>
            <p className="text-sm whitespace-pre-wrap">
              {ticket.description ?? "No description provided."}
            </p>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-3">
              Notes
            </h3>
            <NotesSection
              ticketId={ticketId}
              notes={ticket.notes ?? []}
              onNotesChange={() => mutate()}
            />
          </div>

          {/* Activity log */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-3">
              Activity Log
            </h3>
            <ActivityLogSection entries={ticket.activity_log ?? []} />
          </div>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-3">
              Quick Actions
            </h3>

            {/* Status update */}
            {allowedTransitions.length > 0 && (
              <Select onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Update Status..." />
                </SelectTrigger>
                <SelectContent>
                  {allowedTransitions.map(s => (
                    <SelectItem key={s} value={s}>
                      → {STATUS_LABELS[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {canAssign && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setAssignOpen(true)}
              >
                <UserCheck className="w-4 h-4" />
                Assign / Reassign
              </Button>
            )}

            {canEscalate && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10"
                onClick={() => setEscalateOpen(true)}
              >
                <ChevronUp className="w-4 h-4" />
                Escalate
              </Button>
            )}
          </div>

          {/* Customer info */}
          {ticket.customers && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-3">
                Customer
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{(ticket.customers as { name: string }).name}</span>
                </div>
                {(ticket.customers as { phone?: string }).phone && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {(ticket.customers as { phone: string }).phone}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => router.push(`/dashboard/customers/${ticket.customer_id}`)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Client 360
                </Button>
              </div>
            </div>
          )}

          {/* Policy info */}
          {ticket.policies && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-3">
                Policy
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium font-mono">
                    {(ticket.policies as { policy_number: string }).policy_number}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-6 capitalize">
                  {(ticket.policies as { policy_type: string }).policy_type?.replace(/_/g, " ")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => router.push(`/dashboard/policies/${ticket.policy_id}`)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Policy
                </Button>
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-heading uppercase tracking-wider text-muted-foreground mb-3">
              Documents
            </h3>
            <DocumentAttachments
              ticketId={ticketId}
              documents={ticket.documents ?? []}
              onDocumentsChange={() => mutate()}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EscalationDialog
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        ticketId={ticketId}
        ticketNumber={ticket.ticket_number}
        currentLevel={ticket.escalation_level ?? 0}
        onSuccess={() => mutate()}
      />

      <AssignOwnerDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        ticketId={ticketId}
        ticketNumber={ticket.ticket_number}
        currentOwnerId={ticket.owner_id}
        onSuccess={() => mutate()}
      />
    </motion.div>
  );
}
