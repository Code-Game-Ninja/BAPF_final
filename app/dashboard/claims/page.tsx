"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, ShieldAlert, Eye, MoreHorizontal, Loader2,
  DollarSign, Clock, CheckCircle2, ChevronsUpDown, Check, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { useClaims, useClaimStats } from "@/lib/hooks/use-claims";
import { claimService } from "@/lib/services/claim.service";
import { useSettings } from "@/lib/hooks/use-settings";
import { MiniStat } from "@/components/dashboard/mini-stat";
import type { ClaimStatus, ClaimType, Customer, Policy } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { formatCurrency, cn } from "@/lib/utils";
import { useCustomers } from "@/lib/hooks/use-customers";
import { usePolicies } from "@/lib/hooks/use-policies";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string }> = {
  registered: { label: "Registered", color: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  documents_pending: { label: "Docs Pending", color: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  under_review: { label: "Under Review", color: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  surveyor_appointed: { label: "Surveyor", color: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  assessment_done: { label: "Assessment Done", color: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  approved: { label: "Approved", color: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300" },
  settled: { label: "Settled", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Rejected", color: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  withdrawn: { label: "Withdrawn", color: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300" },
  closed: { label: "Closed", color: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300" },
};

const CLAIM_TYPES: { value: ClaimType; label: string }[] = [
  { value: "own_damage", label: "Own Damage" }, { value: "third_party", label: "Third Party" },
  { value: "death", label: "Death" }, { value: "health", label: "Health" },
  { value: "fire", label: "Fire" }, { value: "theft", label: "Theft" },
  { value: "natural_disaster", label: "Natural Disaster" }, { value: "accident", label: "Accident" },
  { value: "liability", label: "Liability" }, { value: "other", label: "Other" },
];

const PAGE_SIZE = 20;

export default function ClaimsPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { data: claims, isLoading, mutate } = useClaims();
  const { data: stats } = useClaimStats();
  const { data: settings } = useSettings();
  const isMobile = useIsMobile();
  const { data: customers } = useCustomers();
  const { data: policies } = usePolicies();

  // Derive SLA days from settings
  const slaDays = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of settings || []) m[s.key] = String(s.value ?? "");
    return parseInt(m["claim_sla_days"] || "14", 10);
  }, [settings]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Customer and Policy selector states
  const [customerOpen, setCustomerOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const [formData, setFormData] = useState({
    policy_number: "", customer_name: "", claim_type: "other" as ClaimType,
    claim_amount: "", incident_date: "", incident_description: "",
    incident_location: "", insurer_name: "", hospital_name: "", department: "", remarks: "",
  });

  const isAdmin = role === "admin" || role === "manager";

  // Filter policies by selected customer
  const customerPolicies = useMemo(() => {
    if (!selectedCustomer || !policies) return [];
    return policies.filter(p => p.customer_id === selectedCustomer.id && p.status === "active");
  }, [selectedCustomer, policies]);

  // Auto-fill when customer selected
  useEffect(() => {
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        customer_name: selectedCustomer.name,
      }));
      setSelectedPolicy(null); // Reset policy when customer changes
    }
  }, [selectedCustomer]);

  // Auto-fill when policy selected
  useEffect(() => {
    if (selectedPolicy) {
      setFormData(prev => ({
        ...prev,
        policy_number: selectedPolicy.policy_number || "",
        insurer_name: selectedPolicy.insurer_name || "",
      }));
    }
  }, [selectedPolicy]);

  const filtered = useMemo(() => {
    if (!claims) return [];
    return claims.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!c.customer_name.toLowerCase().includes(q) &&
            !c.claim_number.toLowerCase().includes(q) &&
            !(c.policy_number?.toLowerCase() || "").includes(q)) return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.claim_type !== typeFilter) return false;
      return true;
    });
  }, [claims, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreate = async () => {
    if (!user || !formData.customer_name || !formData.claim_amount) return;
    setSaving(true);
    try {
      await claimService.create({
        ...formData,
        claim_amount: parseFloat(formData.claim_amount),
        customer_id: user.id, // Will need actual customer_id
        policy_id: user.id, // Will need actual policy_id
        assigned_to: user.id,
        assigned_to_name: user.name,
        created_by: user.id,
      });
      toast.success("Claim registered");
      setFormOpen(false);
      mutate();
    } catch {
      toast.error("Failed to register claim");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live claims desk
            </div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.16em] text-foreground sm:text-3xl">
              Claims Command Center
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track filing to settlement timelines, monitor SLA breaches, and keep claim operations audit-ready.
            </p>
          </div>
          <motion.div {...hoverLift}>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Register Claim
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
            { icon: ShieldAlert, label: "Total Claims", value: stats.totalClaims, color: "text-blue-500" },
            { icon: Clock, label: "Pending", value: stats.pendingClaims, color: "text-amber-500" },
            { icon: CheckCircle2, label: "Settled", value: stats.settledClaims, color: "text-emerald-500" },
            { icon: DollarSign, label: "Claim Ratio", value: `${stats.claimRatio}%`, color: "text-rose-500" },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <MiniStat icon={item.icon} label={item.label} value={item.value} color={item.color} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Search + Filters */}
      <div className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search claim #, customer, policy..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border-border/80 bg-background/80 pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full border-border/80 bg-background/80 sm:w-45"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full border-border/80 bg-background/80 sm:w-42.5"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CLAIM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/80 bg-muted/50"><ShieldAlert className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-muted-foreground text-sm">{searchQuery ? "No claims match your filters." : "No claims registered yet."}</p>
        </div>
      ) : isMobile ? (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {paginated.map((c) => (
            <motion.div
              key={c.id}
              variants={staggerItem}
              {...hoverLift}
              className="cursor-pointer space-y-3 rounded-2xl border border-border-strong/70 bg-card/95 p-4 shadow-[0_10px_24px_rgba(47,62,64,0.06)]"
              onClick={() => router.push(`/dashboard/claims/${c.id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-bold">{c.customer_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{c.claim_number}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge variant="outline" className={STATUS_CONFIG[c.status]?.color}>{STATUS_CONFIG[c.status]?.label}</Badge>
                  {claimService.isOverSLA(c, slaDays) && (
                    <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-[10px] text-orange-700 dark:text-orange-300">SLA Breach</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                <span className="capitalize">{c.claim_type.replace(/_/g, " ")}</span>
                <span className="text-primary font-medium">{formatCurrency(c.claim_amount)}</span>
                {c.insurer_name && <span>{c.insurer_name}</span>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/80 bg-muted/20">
                <TableHead className="font-heading uppercase tracking-wider text-xs w-27.5">Claim #</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">Customer</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">Policy #</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">Type</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">Source</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Amount</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Settled</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">Status</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">Date</TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs w-15"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c) => (
                <TableRow key={c.id} className="cursor-pointer border-border/70 hover:bg-muted/35" onClick={() => router.push(`/dashboard/claims/${c.id}`)}>
                  <TableCell className="font-mono text-xs text-primary">{c.claim_number}</TableCell>
                  <TableCell className="font-medium">{c.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.policy_number || "-"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{c.claim_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    {c.source === "customer_portal" ? (
                      <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-[10px] text-indigo-700 dark:text-indigo-300">Portal</Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10 text-[10px] text-slate-700 dark:text-slate-300">Internal</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(c.claim_amount)}</TableCell>
                  <TableCell className="text-right">{c.settled_amount ? formatCurrency(c.settled_amount) : "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[c.status]?.color}`}>{STATUS_CONFIG[c.status]?.label}</Badge>
                      {claimService.isOverSLA(c, slaDays) && (
                        <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-[10px] text-orange-700 dark:text-orange-300">SLA Breach</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(c.claim_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/claims/${c.id}`); }}><Eye className="w-4 h-4 mr-2" /> View Details</DropdownMenuItem>
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
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/80 px-3 py-2">
          <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create Claim Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border border-border-strong/70 bg-card/95">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">Register Claim</DialogTitle>
            <DialogDescription>Select customer and policy, then enter claim details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Selector */}
            <div className="space-y-2 col-span-full">
              <Label>Select Customer *</Label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="w-full justify-between border-border/80 bg-background/80">
                    {selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.phone}` : "Search customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) border-border bg-popover p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList className="max-h-75">
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.phone} ${customer.email}`}
                            onSelect={() => {
                              setSelectedCustomer(customer);
                              setCustomerOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">{customer.phone} • {customer.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Policy Selector - Only show when customer selected */}
            {selectedCustomer && customerPolicies.length > 0 && (
              <div className="space-y-2 col-span-full">
                <Label>Select Policy (Optional)</Label>
                <Popover open={policyOpen} onOpenChange={setPolicyOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={policyOpen} className="w-full justify-between border-border/80 bg-background/80">
                      {selectedPolicy ? `${selectedPolicy.policy_number} - ${selectedPolicy.policy_type}` : "Search policy..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) border-border bg-popover p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search policy..." />
                      <CommandList className="max-h-75">
                        <CommandEmpty>No policy found.</CommandEmpty>
                        <CommandGroup>
                          {customerPolicies.map((policy) => (
                            <CommandItem
                              key={policy.id}
                              value={`${policy.policy_number} ${policy.policy_type} ${policy.insurer_name}`}
                              onSelect={() => {
                                setSelectedPolicy(policy);
                                setPolicyOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedPolicy?.id === policy.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-medium">{policy.policy_number}</span>
                                <span className="text-xs text-muted-foreground">{policy.policy_type} • {policy.insurer_name}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2"><Label>Customer Name *</Label><Input value={formData.customer_name} onChange={e => setFormData(d => ({ ...d, customer_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Policy Number</Label><Input value={formData.policy_number} onChange={e => setFormData(d => ({ ...d, policy_number: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Claim Type *</Label>
              <Select value={formData.claim_type} onValueChange={v => setFormData(d => ({ ...d, claim_type: v as ClaimType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLAIM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Claim Amount *</Label><Input type="number" value={formData.claim_amount} onChange={e => setFormData(d => ({ ...d, claim_amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Incident Date</Label><Input type="date" value={formData.incident_date} onChange={e => setFormData(d => ({ ...d, incident_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Insurer</Label><Input value={formData.insurer_name} onChange={e => setFormData(d => ({ ...d, insurer_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Hospital Name</Label><Input value={formData.hospital_name} onChange={e => setFormData(d => ({ ...d, hospital_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Department</Label><Input value={formData.department} onChange={e => setFormData(d => ({ ...d, department: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Incident Location</Label><Input value={formData.incident_location} onChange={e => setFormData(d => ({ ...d, incident_location: e.target.value }))} /></div>
            <div className="space-y-2 col-span-full"><Label>Incident Description</Label><Textarea value={formData.incident_description} onChange={e => setFormData(d => ({ ...d, incident_description: e.target.value }))} /></div>
            <div className="space-y-2 col-span-full"><Label>Remarks</Label><Textarea value={formData.remarks} onChange={e => setFormData(d => ({ ...d, remarks: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.customer_name || !formData.claim_amount}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Register Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
