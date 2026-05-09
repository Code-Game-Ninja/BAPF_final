"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, GitBranch, Eye, Trash2, MoreHorizontal,
  Loader2, X, ArrowRight, CheckCircle2, Clock, ChevronsUpDown, Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { useProposals, useProposalStats } from "@/lib/hooks/use-proposals";
import { proposalService } from "@/lib/services/proposal.service";
import { useSettings } from "@/lib/hooks/use-settings";
import { useCustomers } from "@/lib/hooks/use-customers";
import { usePolicies } from "@/lib/hooks/use-policies";
import type { Proposal, ProposalStatus, Customer, Policy } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { formatCurrency, cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  under_review: { label: "Under Review", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  quote_received: { label: "Quote Received", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  approved: { label: "Approved", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  converted: { label: "Converted", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  expired: { label: "Expired", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

const PAGE_SIZE = 20;

export default function ProposalsPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { data: proposals, isLoading, mutate } = useProposals();
  const { data: stats } = useProposalStats();
  const { data: settings } = useSettings();
  const { data: customers } = useCustomers();
  const { data: allPolicies } = usePolicies();
  const isMobile = useIsMobile();

  // Derive settings values
  const settingsMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of settings || []) m[s.key] = String(s.value ?? "");
    return m;
  }, [settings]);
  const proposalPrefix = settingsMap["proposal_prefix"] || "PRP";
  const validityDays = parseInt(settingsMap["proposal_validity_days"] || "30", 10);
  const policyTypesRaw = settingsMap["policy_types"] || "";
  const policyTypes = policyTypesRaw
    ? policyTypesRaw.split(",").map((t) => t.trim().toLowerCase().replace(/ /g, "_")).filter(Boolean)
    : ["motor","health","life","fire","marine","burglary","liability","workmen_compensation","car_ear","surety_bond","travel","other"];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Proposal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Customer selector state
  const [customerComboOpen, setCustomerComboOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Policy selector state
  const [policyComboOpen, setPolicyComboOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policySearchQuery, setPolicySearchQuery] = useState("");

  // Get policies for selected customer
  const customerPolicies = useMemo(() => {
    if (!selectedCustomer || !allPolicies) return [];
    return allPolicies.filter(p => p.customer_id === selectedCustomer.id && p.status === "active");
  }, [selectedCustomer, allPolicies]);

  // Form state
  const [formData, setFormData] = useState({
    proposal_number: "", customer_name: "", customer_email: "", customer_phone: "",
    policy_type: "motor", insurer_name: "", sum_insured: "",
    premium_quoted: "", coverage_details: "", notes: "", valid_until: "",
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "admin" || role === "manager";

  // Auto-fill form defaults from settings when dialog opens
  useEffect(() => {
    if (!formOpen) return;
    proposalService.getNextNumber(proposalPrefix).then((num) => {
      const validUntil = proposalService.calcValidUntil(validityDays);
      setFormData((d) => ({
        ...d,
        proposal_number: num,
        valid_until: validUntil,
        policy_type: policyTypes[0] || "motor",
      }));
    });
    // Reset customer and policy selection when form opens
    setSelectedCustomer(null);
    setSelectedPolicy(null);
    setCustomerSearchQuery("");
    setPolicySearchQuery("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen]);

  // Auto-fill customer details when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setFormData((d) => ({
        ...d,
        customer_name: selectedCustomer.name,
        customer_email: selectedCustomer.email || "",
        customer_phone: selectedCustomer.phone || "",
      }));
    }
  }, [selectedCustomer]);

  // Auto-fill policy details when policy is selected
  useEffect(() => {
    if (selectedPolicy) {
      setFormData((d) => ({
        ...d,
        policy_type: selectedPolicy.policy_type || "motor",
        insurer_name: selectedPolicy.insurer_name || "",
        sum_insured: selectedPolicy.sum_insured ? String(selectedPolicy.sum_insured) : "",
        premium_quoted: selectedPolicy.premium_amount ? String(selectedPolicy.premium_amount) : "",
        coverage_details: selectedPolicy.remark || "",
      }));
    }
  }, [selectedPolicy]);

  const filtered = useMemo(() => {
    if (!proposals) return [];
    return proposals.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.customer_name.toLowerCase().includes(q) &&
            !p.proposal_number.toLowerCase().includes(q) &&
            !(p.insurer_name?.toLowerCase() || "").includes(q)) return false;
      }
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [proposals, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreate = async () => {
    if (!user || !formData.customer_name) return;
    setSaving(true);
    try {
      await proposalService.create({
        ...formData,
        sum_insured: formData.sum_insured ? parseFloat(formData.sum_insured) : undefined,
        premium_quoted: formData.premium_quoted ? parseFloat(formData.premium_quoted) : undefined,
        assigned_to: user.id,
        assigned_to_name: user.name,
        created_by: user.id,
        created_by_name: user.name,
      });
      toast.success("Proposal created");
      setFormOpen(false);
      setFormData({ proposal_number: "", customer_name: "", customer_email: "", customer_phone: "", policy_type: policyTypes[0] || "motor", insurer_name: "", sum_insured: "", premium_quoted: "", coverage_details: "", notes: "", valid_until: "" });
      mutate();
    } catch {
      toast.error("Failed to create proposal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await proposalService.delete(deletingItem.id);
      toast.success("Proposal deleted");
      mutate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeletingItem(null);
    }
  };

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Proposal workflow desk
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Proposals Pipeline
            </h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} proposal{filtered.length !== 1 ? "s" : ""} tracked from draft to conversion.
            </p>
          </div>
          <motion.div {...hoverLift}>
            <Button onClick={() => setFormOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New Proposal
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      {stats && isAdmin && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            {
              icon: GitBranch,
              label: "Total Proposals",
              value: stats.total,
              panel: "border-blue-500/30 bg-blue-500/10",
              text: "text-blue-700 dark:text-blue-300",
            },
            {
              icon: Clock,
              label: "Pending Review",
              value: (stats.byStatus["submitted"] || 0) + (stats.byStatus["under_review"] || 0),
              panel: "border-amber-500/30 bg-amber-500/10",
              text: "text-amber-700 dark:text-amber-300",
            },
            {
              icon: CheckCircle2,
              label: "Conversion Rate",
              value: `${stats.conversionRate}%`,
              panel: "border-emerald-500/30 bg-emerald-500/10",
              text: "text-emerald-700 dark:text-emerald-300",
            },
            {
              icon: ArrowRight,
              label: "Total Quoted",
              value: formatCurrency(stats.totalQuoted),
              panel: "border-indigo-500/30 bg-indigo-500/10",
              text: "text-indigo-700 dark:text-indigo-300",
            },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <Card className={item.panel}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className={`mt-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                      <item.icon className={`h-4 w-4 ${item.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Search + Filters */}
      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, proposal #, insurer..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10 border-border/80 bg-background/80"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-40 border-border/80 bg-background/80">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover">
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="gap-1 hover:bg-muted">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </section>

      {/* Loading / Empty / Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-border-strong/70 bg-card/90 p-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <GitBranch className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            {searchQuery || statusFilter !== "all" ? "No proposals match your filters." : "No proposals yet."}
          </p>
        </div>
      ) : isMobile ? (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {paginated.map((p) => (
            <motion.div key={p.id} variants={staggerItem}
              className="cursor-pointer space-y-3 rounded-2xl border border-border-strong/70 bg-card/95 p-4 shadow-[0_8px_20px_rgba(47,62,64,0.05)] hover:border-primary/35"
              onClick={() => router.push(`/dashboard/proposals/${p.id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-bold text-foreground">{p.customer_name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.proposal_number}</p>
                </div>
                <Badge variant="outline" className={STATUS_CONFIG[p.status]?.color}>{STATUS_CONFIG[p.status]?.label}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{p.policy_type}</span>
                {p.insurer_name && <span>{p.insurer_name}</span>}
                {p.premium_quoted && <span className="text-primary">{formatCurrency(p.premium_quoted)}</span>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/80 bg-muted/20">
                <TableHead className="w-27.5 font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Proposal #</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Customer</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Type</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Insurer</TableHead>
                <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Premium</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Date</TableHead>
                <TableHead className="w-20 font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((p) => (
                <TableRow key={p.id} className="group cursor-pointer border-border/70 hover:bg-muted/35" onClick={() => router.push(`/dashboard/proposals/${p.id}`)}>
                  <TableCell className="font-mono text-xs text-primary">{p.proposal_number}</TableCell>
                  <TableCell className="font-medium">{p.customer_name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{p.policy_type.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-muted-foreground">{p.insurer_name || "—"}</TableCell>
                  <TableCell className="text-right">{p.premium_quoted ? formatCurrency(p.premium_quoted) : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${STATUS_CONFIG[p.status]?.color}`}>{STATUS_CONFIG[p.status]?.label}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(p.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/proposals/${p.id}`); }}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                        {isAdmin && <><DropdownMenuSeparator /><DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeletingItem(p); }} className="text-red-400"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-border-strong/60 bg-card/80 p-3">
          <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-border" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="border-border" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create Dialog with Smart Customer & Policy Selection */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border border-border-strong/70 bg-card">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-[0.14em]">New Proposal</DialogTitle>
            <DialogDescription>Fill in the proposal details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Proposal Number */}
            <div className="space-y-2">
              <Label>Proposal Number</Label>
              <Input value={formData.proposal_number} onChange={(e) => setFormData(d => ({ ...d, proposal_number: e.target.value }))} className="font-mono text-sm border-border/80 bg-background/80" />
              <p className="text-xs text-muted-foreground">Auto-generated from prefix: <strong>{proposalPrefix}</strong></p>
            </div>

            {/* Customer Selector (Combobox) */}
            <div className="space-y-2">
              <Label>Select Customer *</Label>
              <Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerComboOpen}
                    className="w-full justify-between border-border/80 bg-background/80 font-normal"
                  >
                    {selectedCustomer ? (
                      <span className="truncate">{selectedCustomer.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Search customers...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] border-border bg-popover p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search customer by name, phone, email..." 
                      value={customerSearchQuery}
                      onValueChange={setCustomerSearchQuery}
                    />
                    <CommandList className="max-h-75">
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers?.slice(0, 50).map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.email || ""} ${customer.phone || ""}`}
                            onSelect={() => {
                              setSelectedCustomer(customer);
                              setSelectedPolicy(null);
                              setCustomerComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {customer.phone || customer.email || "No contact"}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedCustomer && (
                <p className="text-xs text-muted-foreground">
                  {selectedCustomer.uid} • {customerPolicies.length} active {customerPolicies.length === 1 ? "policy" : "policies"}
                </p>
              )}
            </div>

            {/* Customer Name (editable after selection) */}
            <div className="space-y-2 col-span-full">
              <Label>Customer Name *</Label>
              <Input 
                value={formData.customer_name} 
                onChange={(e) => setFormData(d => ({ ...d, customer_name: e.target.value }))}
                placeholder="Select customer or type name"
                className="border-border/80 bg-background/80"
              />
            </div>

            {/* Email & Phone (auto-filled) */}
            <div className="space-y-2"><Label>Email</Label><Input type="email" className="border-border/80 bg-background/80" value={formData.customer_email} onChange={(e) => setFormData(d => ({ ...d, customer_email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input className="border-border/80 bg-background/80" value={formData.customer_phone} onChange={(e) => setFormData(d => ({ ...d, customer_phone: e.target.value }))} /></div>

            {/* Policy Selector (only if customer selected and has policies) */}
            {selectedCustomer && customerPolicies.length > 0 && (
              <div className="space-y-2 col-span-full">
                <Label>Based on Existing Policy (Optional)</Label>
                <Popover open={policyComboOpen} onOpenChange={setPolicyComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={policyComboOpen}
                      className="w-full justify-between border-border/80 bg-background/80 font-normal"
                    >
                      {selectedPolicy ? (
                        <span className="truncate">
                          {selectedPolicy.policy_number} • {selectedPolicy.policy_type?.replace(/_/g, " ")} • {selectedPolicy.insurer_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select a policy to auto-fill details...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] border-border bg-popover p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search policy..." 
                        value={policySearchQuery}
                        onValueChange={setPolicySearchQuery}
                      />
                      <CommandList className="max-h-75">
                        <CommandEmpty>No policies found for this customer.</CommandEmpty>
                        <CommandGroup>
                          {customerPolicies.map((policy) => (
                            <CommandItem
                              key={policy.id}
                              value={`${policy.policy_number} ${policy.policy_type} ${policy.insurer_name}`}
                              onSelect={() => {
                                setSelectedPolicy(policy);
                                setPolicyComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPolicy?.id === policy.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium font-mono text-xs">{policy.policy_number}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {policy.policy_type?.replace(/_/g, " ")} • {policy.insurer_name}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Selecting a policy will auto-fill: policy type, insurer, sum insured, premium, coverage details
                </p>
              </div>
            )}

            {/* Policy Details (auto-filled if policy selected) */}
            <div className="space-y-2"><Label>Policy Type *</Label>
              <Select value={formData.policy_type} onValueChange={(v) => setFormData(d => ({ ...d, policy_type: v }))}>
                <SelectTrigger className="border-border/80 bg-background/80"><SelectValue /></SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {policyTypes.map(t => (<SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Insurer</Label><Input className="border-border/80 bg-background/80" value={formData.insurer_name} onChange={(e) => setFormData(d => ({ ...d, insurer_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Sum Insured</Label><Input type="number" className="border-border/80 bg-background/80" value={formData.sum_insured} onChange={(e) => setFormData(d => ({ ...d, sum_insured: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Premium Quoted</Label><Input type="number" className="border-border/80 bg-background/80" value={formData.premium_quoted} onChange={(e) => setFormData(d => ({ ...d, premium_quoted: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input type="date" className="border-border/80 bg-background/80" value={formData.valid_until} onChange={(e) => setFormData(d => ({ ...d, valid_until: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Default: {validityDays} days from today</p>
            </div>
            <div className="space-y-2 col-span-full"><Label>Coverage Details</Label><Textarea className="border-border/80 bg-background/80" value={formData.coverage_details} onChange={(e) => setFormData(d => ({ ...d, coverage_details: e.target.value }))} rows={3} /></div>
            <div className="space-y-2 col-span-full"><Label>Notes</Label><Textarea className="border-border/80 bg-background/80" value={formData.notes} onChange={(e) => setFormData(d => ({ ...d, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.customer_name} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-[0.12em]">Delete Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.proposal_number}</strong> — {deletingItem?.customer_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
