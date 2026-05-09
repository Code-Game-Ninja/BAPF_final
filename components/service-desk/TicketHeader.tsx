"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SLACountdown } from "./SLACountdown";
import { ChevronUp, Calendar, User, Tag } from "lucide-react";

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
  ecard_request: "E-Card Request",
  member_endorsement: "Member Endorsement",
  name_correction: "Name Correction",
  address_correction: "Address Correction",
  invoice_dispute: "Invoice Dispute",
  claim_assistance: "Claim Assistance",
  general_query: "General Query",
  validity_renewal: "Validity Renewal",
  vehicle_endorsement: "Vehicle Endorsement",
  policy_query: "Policy Query",
  document_request: "Document Request",
};

interface TicketHeaderProps {
  ticketNumber: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  slaDeadline?: string;
  isBreached?: boolean;
  escalationLevel?: number;
  ownerName?: string;
}

export function TicketHeader({
  ticketNumber,
  category,
  priority,
  status,
  createdAt,
  slaDeadline,
  isBreached,
  escalationLevel = 0,
  ownerName,
}: TicketHeaderProps) {
  const isPaused = status === "pending";

  return (
    <div className="space-y-3">
      {/* Ticket number + escalation */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-heading font-bold font-mono text-primary">
          {ticketNumber}
        </h1>
        {escalationLevel > 0 && (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 gap-1">
            <ChevronUp className="w-3.5 h-3.5" />
            Escalated L{escalationLevel}
          </Badge>
        )}
        {isBreached && (
          <Badge className="bg-red-600/20 text-red-400 border-red-500/40 animate-pulse">
            SLA BREACHED
          </Badge>
        )}
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <Tag className="w-3 h-3" />
          {CATEGORY_LABELS[category] ?? category}
        </Badge>
        <Badge variant="outline" className={PRIORITY_COLORS[priority] ?? ""}>
          {priority}
        </Badge>
        <Badge variant="outline" className={STATUS_COLORS[status] ?? ""}>
          {status?.replace(/_/g, " ")}
        </Badge>
        <SLACountdown
          createdAt={createdAt}
          slaDeadline={slaDeadline}
          isPaused={isPaused}
          isBreached={isBreached}
        />
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Created {format(new Date(createdAt), "dd MMM yyyy, HH:mm")}
        </div>
        {ownerName && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Assigned to {ownerName}
          </div>
        )}
        {slaDeadline && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            SLA: {format(new Date(slaDeadline), "dd MMM yyyy, HH:mm")}
          </div>
        )}
      </div>
    </div>
  );
}
