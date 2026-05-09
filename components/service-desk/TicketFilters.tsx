"use client";

import { useState } from "react";
import { X, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export interface TicketFiltersState {
  search: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string;
  customerId: string;
  policyId: string;
  breachedOnly: boolean;
  escalatedOnly: boolean;
  includeArchived: boolean;
}

const CATEGORIES = [
  { value: "ecard_request", label: "E-Card Request" },
  { value: "member_endorsement", label: "Member Endorsement" },
  { value: "name_correction", label: "Name Correction" },
  { value: "address_correction", label: "Address Correction" },
  { value: "invoice_dispute", label: "Invoice Dispute" },
  { value: "claim_assistance", label: "Claim Assistance" },
  { value: "general_query", label: "General Query" },
  { value: "validity_renewal", label: "Validity Renewal" },
  { value: "vehicle_endorsement", label: "Vehicle Endorsement" },
  { value: "policy_query", label: "Policy Query" },
  { value: "document_request", label: "Document Request" },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

interface TicketFiltersProps {
  filters: TicketFiltersState;
  onFiltersChange: (filters: TicketFiltersState) => void;
  onSearchChange: (search: string) => void;
}

export function TicketFilters({
  filters,
  onFiltersChange,
  onSearchChange,
}: TicketFiltersProps) {
  const activeFilterCount = [
    filters.category,
    filters.priority,
    filters.status,
    filters.assignedTo,
    filters.breachedOnly,
    filters.escalatedOnly,
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({
      search: "",
      category: "",
      priority: "",
      status: "",
      assignedTo: "",
      customerId: filters.customerId,
      policyId: filters.policyId,
      breachedOnly: false,
      escalatedOnly: false,
      includeArchived: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tickets..."
          value={filters.search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {filters.search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Filter header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">{activeFilterCount}</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-7">
            Reset
          </Button>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Category</Label>
        <Select
          value={filters.category || "all"}
          onValueChange={v => onFiltersChange({ ...filters, category: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Priority</Label>
        <Select
          value={filters.priority || "all"}
          onValueChange={v => onFiltersChange({ ...filters, priority: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
        <Select
          value={filters.status || "all"}
          onValueChange={v => onFiltersChange({ ...filters, status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toggle filters */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-sm cursor-pointer">Breached Only</Label>
          <Switch
            checked={filters.breachedOnly}
            onCheckedChange={v => onFiltersChange({ ...filters, breachedOnly: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm cursor-pointer">Escalated Only</Label>
          <Switch
            checked={filters.escalatedOnly}
            onCheckedChange={v => onFiltersChange({ ...filters, escalatedOnly: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm cursor-pointer">Include Archived</Label>
          <Switch
            checked={filters.includeArchived}
            onCheckedChange={v => onFiltersChange({ ...filters, includeArchived: v })}
          />
        </div>
      </div>
    </div>
  );
}
