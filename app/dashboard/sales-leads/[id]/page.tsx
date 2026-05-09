"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  CalendarClock,
  Target,
  Loader2,
  RefreshCw,
  UserPlus,
  MapPin,
  Building2,
  IndianRupee,
  User,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useLead, useLeadTimeline, invalidateLeads } from "@/lib/hooks/use-leads";
import { deleteLead } from "@/lib/services/lead.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { formatCurrency } from "@/lib/utils";
import { sendLeadWhatsApp, LeadMessageType } from "@/lib/helpers/whatsapp";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LeadForm } from "@/components/sales-leads/lead-form";
import { LeadStatusBadge, LeadPriorityBadge, LeadSourceBadge } from "@/components/sales-leads/lead-status-badge";
import { LeadTimelineView } from "@/components/sales-leads/lead-timeline";
import { LeadAddNote } from "@/components/sales-leads/lead-add-note";
import { LeadScheduleFollowUp } from "@/components/sales-leads/lead-schedule-followup";
import { LeadReassignDialog } from "@/components/sales-leads/lead-reassign-dialog";
import { LeadConvertDialog } from "@/components/sales-leads/lead-convert-dialog";
import { LeadDocumentsPanel } from "@/components/sales-leads/lead-documents-panel";
import { LeadRemindersPanel } from "@/components/sales-leads/lead-reminders-panel";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const leadId = params.id as string;
  const { data: lead, isLoading, mutate: mutateLead } = useLead(leadId);
  const { data: timeline, mutate: mutateTimeline } = useLeadTimeline(leadId);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = role === "admin" || role === "manager" || role === "employee";
  const canDelete = role === "admin";
  const canReassign = role === "admin" || role === "manager";

  const handleWhatsApp = (messageType: LeadMessageType) => {
    if (!lead) return;
    sendLeadWhatsApp({
      customerName: lead.customer_name,
      customerPhone: lead.mobile,
      salespersonName: user?.name,
      messageType,
    });
  };

  const handleDelete = async () => {
    if (!lead || !user) return;
    setDeleting(true);
    try {
      await deleteLead(lead.id, user.id);
      await auditLogService.logAction(
        user.id,
        user.name,
        "delete",
        "sales-leads",
        `Deleted lead: ${lead.lead_number} — ${lead.customer_name}`
      );
      toast.success("Lead deleted");
      invalidateLeads();
      router.push("/dashboard/sales-leads");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const refreshData = () => {
    mutateLead();
    mutateTimeline();
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-20 gap-4">
        <Target className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/sales-leads")}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const createdDate = lead.createdAt
    ? format(new Date(lead.createdAt), "dd MMM yyyy, hh:mm a")
    : "—";

  return (
    <motion.div {...pageTransition} className="max-w-5xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/sales-leads")}
          className="gap-2 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Sales Leads
        </Button>
        <div className="flex flex-wrap gap-2">
          {lead.status !== "converted" && lead.status !== "lost" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 text-green-500 hover:text-green-500 border-green-500/30">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleWhatsApp("thank_you")}>
                  Thank You
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleWhatsApp("follow_up")}>
                  Follow-Up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleWhatsApp("meeting_invite")}>
                  Meeting Invite
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleWhatsApp("proposal")}>
                  Send Proposal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {lead.status !== "converted" && lead.status !== "lost" && canEdit && (
            <Button variant="outline" onClick={() => setConvertOpen(true)} className="gap-2 text-emerald-500 hover:text-emerald-500 border-emerald-500/30">
              <UserPlus className="w-4 h-4" /> Convert
            </Button>
          )}
          {canReassign && (
            <Button variant="outline" onClick={() => setReassignOpen(true)} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Reassign
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setFormOpen(true)} className="gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="gap-2 text-red-400 hover:text-red-400 border-red-400/30"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main content: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Lead Info (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-heading font-bold text-primary">
                  {lead.customer_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-heading font-bold text-foreground uppercase tracking-wider truncate">
                  {lead.customer_name}
                </h1>
                <p className="text-sm font-mono text-primary mt-0.5">{lead.lead_number}</p>
              </div>
            </div>

            <Separator className="my-5" />

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              <LeadStatusBadge status={lead.status} />
              <LeadPriorityBadge priority={lead.priority} />
              <LeadSourceBadge source={lead.source} />
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow icon={Phone} label="Mobile" value={lead.mobile} href={`tel:${lead.mobile}`} />
              {lead.alt_mobile && <DetailRow icon={Phone} label="Alt Mobile" value={lead.alt_mobile} href={`tel:${lead.alt_mobile}`} />}
              {lead.email && <DetailRow icon={Mail} label="Email" value={lead.email} href={`mailto:${lead.email}`} />}
              {lead.poc_name && <DetailRow icon={User} label="POC Name" value={lead.poc_name} />}
              {lead.location && <DetailRow icon={MapPin} label="Location" value={lead.location} />}
              {lead.client_type && lead.client_type !== "individual" && (
                <DetailRow icon={Building2} label="Client Type" value={lead.client_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
              )}
              {lead.client_type === "individual" && (
                <DetailRow icon={Building2} label="Client Type" value="Individual" />
              )}
              {(lead.estimated_value ?? 0) > 0 && (
                <DetailRow icon={IndianRupee} label="Est. Value" value={formatCurrency(lead.estimated_value!)} />
              )}
              <DetailRow icon={UserCheck} label="Assigned To" value={lead.assigned_to_name || "—"} />
              <DetailRow icon={Calendar} label="Lead Date" value={lead.lead_date ? format(new Date(lead.lead_date), "dd MMM yyyy") : "—"} />
              {lead.follow_up_date && (
                <DetailRow
                  icon={CalendarClock}
                  label="Follow-Up"
                  value={format(new Date(lead.follow_up_date), "dd MMM yyyy")}
                />
              )}
              {lead.meeting_date && (
                <DetailRow
                  icon={CalendarClock}
                  label="Meeting Date"
                  value={format(new Date(lead.meeting_date), "dd MMM yyyy")}
                />
              )}
              <DetailRow icon={Calendar} label="Created" value={createdDate} />
              {lead.created_by_name && (
                <DetailRow icon={UserCheck} label="Created By" value={lead.created_by_name} />
              )}
            </div>

            {/* Notes */}
            {lead.notes && (
              <>
                <Separator className="my-5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{lead.notes}</p>
                </div>
              </>
            )}
          </div>

          {/* Schedule Follow-Up */}
          <LeadScheduleFollowUp
            leadId={lead.id}
            currentDate={lead.follow_up_date}
            onSuccess={refreshData}
          />
        </div>

        {/* Right: Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Note */}
          <LeadAddNote leadId={lead.id} onSuccess={refreshData} />

          {/* Timeline */}
          <LeadTimelineView timeline={timeline} isLoading={!timeline} />

          {/* Documents */}
          <LeadDocumentsPanel leadId={lead.id} onSuccess={refreshData} />

          {/* Reminders */}
          <LeadRemindersPanel leadId={lead.id} />
        </div>
      </div>

      {/* Edit dialog */}
      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={lead}
        onSuccess={() => {
          setFormOpen(false);
          refreshData();
        }}
      />

      {/* Reassign dialog */}
      <LeadReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        lead={lead}
        onSuccess={refreshData}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">
              Delete Lead
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{lead.lead_number}</strong> —{" "}
              {lead.customer_name}? This is a soft delete and can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert dialog */}
      <LeadConvertDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        lead={lead}
        onSuccess={refreshData}
      />
    </motion.div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className || ""}`}>
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
          {label}
        </p>
        {href ? (
          <a href={href} className="text-sm text-primary hover:underline mt-0.5 inline-block">
            {value}
          </a>
        ) : (
          <p className="text-sm text-foreground mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}
