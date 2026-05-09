"use client";

import { Badge } from "@/components/ui/badge";
import { LeadStatus, LeadPriority, LeadSource } from "@/lib/types";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500/10 text-blue-500",
  contacted: "bg-sky-500/10 text-sky-500",
  follow_up: "bg-amber-500/10 text-amber-500",
  interested: "bg-green-500/10 text-green-500",
  meeting_done: "bg-teal-500/10 text-teal-500",
  proposal_sent: "bg-violet-500/10 text-violet-500",
  negotiation: "bg-indigo-500/10 text-indigo-500",
  not_interested: "bg-gray-500/10 text-gray-400",
  converted: "bg-emerald-500/10 text-emerald-500",
  lost: "bg-red-500/10 text-red-400",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-Up",
  interested: "Interested",
  meeting_done: "Meeting Done",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  not_interested: "Not Interested",
  converted: "Converted",
  lost: "Lost",
};

const PRIORITY_COLORS: Record<LeadPriority, string> = {
  low: "bg-gray-500/10 text-gray-400",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

const PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  referral: "Referral",
  walk_in: "Walk-in",
  online: "Online",
  telecall: "Telecall",
  social_media: "Social Media",
  agent: "Agent",
  other: "Other",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge className={`text-xs capitalize ${STATUS_COLORS[status] || ""}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

export function LeadPriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <Badge className={`text-xs capitalize ${PRIORITY_COLORS[priority] || ""}`}>
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  );
}

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  return (
    <Badge variant="secondary" className="text-xs">
      {SOURCE_LABELS[source] || source}
    </Badge>
  );
}
