"use client";

import { useRouter } from "next/navigation";
import {
  FileText, Shield, MessageSquare, Upload, Pencil, Plus,
  Phone, Mail, RefreshCw, Zap, ExternalLink,
} from "lucide-react";
import { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface QuickActionsTabProps {
  customer: Customer;
  onCreatePolicy: () => void;
  onCreateTicket: () => void;
  onUploadDoc: () => void;
  onEdit: () => void;
}

export function QuickActionsTab({
  customer,
  onCreatePolicy,
  onCreateTicket,
  onUploadDoc,
  onEdit,
}: QuickActionsTabProps) {
  const router = useRouter();

  const actions = [
    {
      group: "Policy Actions",
      items: [
        {
          label: "Create New Policy",
          description: "Start a new policy intake for this customer",
          icon: FileText,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          onClick: onCreatePolicy,
        },
        {
          label: "View All Policies",
          description: "See all policies linked to this customer",
          icon: ExternalLink,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          onClick: () => router.push(`/dashboard/policies?customer=${customer.id}`),
        },
      ],
    },
    {
      group: "Service Actions",
      items: [
        {
          label: "Create Service Ticket",
          description: "Log a new service request for this customer",
          icon: MessageSquare,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          onClick: onCreateTicket,
        },
        {
          label: "View Claims",
          description: "See all claims for this customer",
          icon: Shield,
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          onClick: () => router.push(`/dashboard/claims?customer=${customer.id}`),
        },
      ],
    },
    {
      group: "Document Actions",
      items: [
        {
          label: "Upload KYC Document",
          description: "Add a new KYC or compliance document",
          icon: Upload,
          color: "text-green-400",
          bg: "bg-green-500/10",
          onClick: onUploadDoc,
        },
      ],
    },
    {
      group: "Customer Actions",
      items: [
        {
          label: "Edit Customer",
          description: "Update customer details and metadata",
          icon: Pencil,
          color: "text-foreground",
          bg: "bg-muted/50",
          onClick: onEdit,
        },
        {
          label: "Call Customer",
          description: customer.phone || "No phone on file",
          icon: Phone,
          color: "text-green-400",
          bg: "bg-green-500/10",
          onClick: () => {
            if (customer.phone && customer.phone !== "N/A") {
              window.open(`tel:${customer.phone}`);
            }
          },
          disabled: !customer.phone || customer.phone === "N/A",
        },
        {
          label: "Email Customer",
          description: customer.email || "No email on file",
          icon: Mail,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          onClick: () => {
            if (customer.email && customer.email !== "N/A") {
              window.open(`mailto:${customer.email}`);
            }
          },
          disabled: !customer.email || customer.email === "N/A",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Quick Actions</h3>
      </div>

      {actions.map(({ group, items }) => (
        <div key={group} className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">{group}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map(({ label, description, icon: Icon, color, bg, onClick, disabled }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                className={`flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-left transition-colors ${
                  disabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-muted/30 cursor-pointer"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
