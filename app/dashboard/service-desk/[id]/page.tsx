"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileText, Clock, AlertTriangle, CheckCircle,
  Loader2, Lock, Globe, Send,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { SLACountdown } from "@/components/service-desk/SLACountdown";
import { TicketDetailResponse, TicketNote, TicketActivity, TicketDocument } from "@/lib/types/service-desk";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pending:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  resolved:    "bg-green-500/10 text-green-400 border-green-500/20",
  closed:      "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400",
  high:   "bg-orange-500/10 text-orange-400",
  medium: "bg-amber-500/10 text-amber-400",
  low:    "bg-gray-500/10 text-gray-400",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  open:        ["in_progress"],
  in_progress: ["pending", "resolved"],
  pending:     ["in_progress"],
  resolved:    ["closed"],
  closed:      [],
};

const CATEGORY_LABELS: Record<string, string> = {
  ecard_request:     "E-Card Request",
  member_endorsement:"Member Endorsement",
  name_correction:   "Name Correction",
  address_correction:"Address Correction",
  invoice_dispute:   "Invoice Dispute",
  claim_assistance:  "Claim Assistance",
  general_query:     "General Query",
};

const STATUS_STEPS = ["open", "in_progress", "pending", "resolved", "closed"];

async function fetchTicketDetail(id: string, token: string): Promise<TicketDetailResponse> {
  const res = await fetch(`/api/service-desk/tickets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch ticket");
  const data = await res.json();
  return data as TicketDetailResponse;
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";
  const ticketId = params.id as string;

  const { data, isLoading, mutate } = useSWR(
    token ? `ticket-${ticketId}` : null,
    () => fetchTicketDetail(ticketId, token),
    { revalidateOnFocus: false }
  );

  const ticket = data?.ticket;
  const notes = data?.notes ?? [];
  const activity = data?.activity ?? [];
  const documents = data?.documents ?? [];

  // UI state
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"internal" | "customer">("internal");
  const [addingNote, setAddingNote] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeNoteTab, setActiveNoteTab] = useState<"internal" | "customer">("internal");

  const canEdit = role === "admin" || role === "manager" || role === "employee";

  const handleStatusUpdate = async (newStatus: string) => {
    if (!ticket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update status");
      }
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
      void mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: noteContent, visibility: noteVisibility }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      toast.success("Note added");
      setNoteContent("");
      void mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) {
      toast.error("Escalation reason is required");
      return;
    }
    setEscalating(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: escalateReason }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to escalate");
      }
      toast.success("Ticket escalated");
      setEscalateOpen(false);
      setEscalateReason("");
      void mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to escalate");
    } finally {
      setEscalating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Ticket not found.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/service-desk")}>
          Back to Service Desk
        </Button>
      </div>
    );
  }

  const allowedTransitions = VALID_TRANSITIONS[ticket.status] ?? [];
  const filteredNotes = notes.filter((n: TicketNote) => n.visibility === activeNoteTab);

  return (
    <motion.div {...pageTransition} className="space-y-6 max-w-6xl p-6">
      {/* Back */}
      <Button variant="ghost" onClick={() => router.push("/dashboard/service-desk")} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Service Desk
      </Button>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono font-bold text-lg">{ticket.ticket_number}</span>
              <Badge variant="outline" className={`text-xs ${STATUS_COLORS[ticket.status] || ""}`}>
                {ticket.status?.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[ticket.priority] || ""}`}>
                {ticket.priority}
              </Badge>
              {ticket.escalation_level > 0 && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Escalated L{ticket.escalation_level}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {CATEGORY_LABELS[ticket.category] || ticket.category}
              {ticket.customers && ` · ${ticket.customers.name}`}
              {ticket.policies && ` · ${ticket.policies.policy_number}`}
            </p>
            <p className="text-sm mt-2">{ticket.description}</p>
          </div>

          {/* SLA Countdown */}
          {ticket.sla_deadline && (
            <div className="flex-shrink-0">
              <SLACountdown
                createdAt={ticket.created_at}
                slaDeadline={ticket.sla_deadline}
                isPaused={ticket.status === "pending"}
                isBreached={ticket.is_breached}
              />
            </div>
          )}
        </div>

        {/* Status Timeline */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_STEPS.map((step, idx) => {
              const currentIdx = STATUS_STEPS.indexOf(ticket.status);
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                    isCurrent ? "bg-primary text-primary-foreground"
                    : isDone ? "bg-green-500/10 text-green-400"
                    : "bg-muted/30 text-muted-foreground"
                  }`}>
                    {isDone && <CheckCircle className="w-3 h-3" />}
                    {step.replace(/_/g, " ")}
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`w-4 h-0.5 ${isDone ? "bg-green-500/40" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        {canEdit && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
            {allowedTransitions.map(s => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => void handleStatusUpdate(s)}
                className="gap-2"
              >
                {updatingStatus && <Loader2 className="w-3 h-3 animate-spin" />}
                → {s.replace(/_/g, " ")}
              </Button>
            ))}
            {ticket.status !== "resolved" && ticket.status !== "closed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEscalateOpen(true)}
                className="gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Escalate
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Notes + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes Section */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
              {(["internal", "customer"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveNoteTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    activeNoteTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "internal" ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  {tab === "internal" ? "Internal Notes" : "Customer Notes"}
                  <Badge variant="secondary" className="text-xs ml-1">
                    {notes.filter((n: TicketNote) => n.visibility === tab).length}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Add note */}
            {canEdit && (
              <div className="space-y-2 mb-4">
                <Textarea
                  placeholder={activeNoteTab === "internal"
                    ? "Add internal note (visible to staff only)..."
                    : "Add customer note (visible to customer)..."}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    disabled={!noteContent.trim() || addingNote}
                    onClick={() => {
                      setNoteVisibility(activeNoteTab);
                      void handleAddNote();
                    }}
                    className="gap-2"
                  >
                    {addingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <Send className="w-3.5 h-3.5" />
                    Add Note
                  </Button>
                </div>
              </div>
            )}

            {/* Notes list */}
            {filteredNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No {activeNoteTab} notes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note: TicketNote) => (
                  <div key={note.id} className={`p-3 rounded-lg border ${
                    note.visibility === "internal"
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-blue-500/5 border-blue-500/20"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{note.author_name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">
                        {note.created_at ? format(new Date(note.created_at), "dd MMM yyyy, HH:mm") : "—"}
                      </span>
                    </div>
                    <p className="text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Activity Log
            </h3>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((entry: TicketActivity) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">{entry.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.performed_by_name || "System"}
                        {entry.created_at && ` · ${format(new Date(entry.created_at), "dd MMM yyyy, HH:mm")}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Info cards */}
        <div className="space-y-4">
          {/* Customer */}
          {ticket.customers && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading mb-2">Customer</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {ticket.customers.name?.charAt(0)?.toUpperCase() ?? "C"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{ticket.customers.name}</p>
                  <p className="text-xs text-muted-foreground">{ticket.customers.phone}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 gap-2"
                onClick={() => router.push(`/dashboard/customers/${ticket.customers?.id}`)}
              >
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                View Client 360
              </Button>
            </div>
          )}

          {/* Policy */}
          {ticket.policies && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading mb-2">Policy</p>
              <p className="text-sm font-medium">{ticket.policies.policy_number}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {ticket.policies.policy_type?.replace(/_/g, " ")} · {ticket.policies.insurer_name}
              </p>
            </div>
          )}

          {/* Ticket Info */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">Ticket Info</p>
            {[
              { label: "Created", value: ticket.created_at ? format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm") : "—" },
              { label: "SLA Deadline", value: ticket.sla_deadline ? format(new Date(ticket.sla_deadline), "dd MMM yyyy, HH:mm") : "—" },
              { label: "Resolved", value: ticket.resolved_at ? format(new Date(ticket.resolved_at), "dd MMM yyyy, HH:mm") : "—" },
              { label: "Resolution Time", value: ticket.resolution_time_minutes
                  ? `${Math.round(ticket.resolution_time_minutes / 60)}h ${ticket.resolution_time_minutes % 60}m`
                  : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right max-w-[140px] truncate">{value}</span>
              </div>
            ))}
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading mb-2">
                Attachments ({documents.length})
              </p>
              <div className="space-y-2">
                {documents.map((doc: TicketDocument) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {doc.file_name}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Escalation Dialog */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Escalate Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Escalating will notify managers and flag this ticket for priority attention.
            </p>
            <div className="space-y-1.5">
              <Label>Escalation Reason <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Describe why this ticket needs escalation..."
                value={escalateReason}
                onChange={e => setEscalateReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEscalateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => void handleEscalate()}
              disabled={escalating || !escalateReason.trim()}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              {escalating && <Loader2 className="w-4 h-4 animate-spin" />}
              Escalate Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
