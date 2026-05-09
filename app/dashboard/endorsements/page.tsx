"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  FileCheck,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Loader2,
  Clock,
  ChevronsUpDown,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/lib/context/auth-context";
import { useEndorsements } from "@/lib/hooks/use-endorsements";
import { endorsementService } from "@/lib/services/endorsement.service";
import { MiniStat } from "@/components/dashboard/mini-stat";
import type { Endorsement, EndorsementStatus, Policy } from "@/lib/types";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import { formatCurrency, cn } from "@/lib/utils";
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

const STATUS_CONFIG: Record<EndorsementStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  approved: { label: "Approved", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Rejected", color: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  processed: { label: "Processed", color: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
};

const TYPES = ["name_change", "address_change", "sum_insured_change", "nominee_change", "coverage_change", "vehicle_change", "addition", "deletion", "other"];

const PAGE_SIZE = 20;

export default function EndorsementsPage() {
  const { user, role } = useAuth();
  const { data: endorsements, isLoading, mutate } = useEndorsements();
  const isMobile = useIsMobile();
  const { data: policies } = usePolicies();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ customer_name: "", policy_number: "", endorsement_type: "other", changes: "", premium_difference: "", remarks: "" });
  const isAdmin = role === "admin" || role === "manager";

  // Policy selector state
  const [policyOpen, setPolicyOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Filter active policies only
  const activePolicies = useMemo(() => {
    if (!policies) return [];
    return policies.filter(p => p.status === "active");
  }, [policies]);

  // Auto-fill when policy selected
  useEffect(() => {
    if (selectedPolicy) {
      setFormData(prev => ({
        ...prev,
        policy_number: selectedPolicy.policy_number || "",
        customer_name: selectedPolicy.customer_name || "",
      }));
    }
  }, [selectedPolicy]);

  const filtered = useMemo(() => {
    if (!endorsements) return [];
    return endorsements.filter(e => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!(e.customer_name?.toLowerCase() || "").includes(q) && !(e.endorsement_number?.toLowerCase() || "").includes(q) && !(e.policy_number?.toLowerCase() || "").includes(q)) return false;
      }
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return true;
    });
  }, [endorsements, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const endorsementStats = useMemo(() => {
    const all = endorsements ?? [];
    const premiumChange = all.reduce((sum, item) => sum + (item.premium_difference || 0), 0);
    return {
      total: all.length,
      pending: all.filter((item) => item.status === "pending").length,
      approved: all.filter((item) => item.status === "approved").length,
      premiumChange,
    };
  }, [endorsements]);

  const handleCreate = async () => {
    if (!user || !formData.customer_name) return;
    setSaving(true);
    try {
      await endorsementService.create({
        ...formData,
        premium_difference: formData.premium_difference ? parseFloat(formData.premium_difference) : undefined,
        created_by: user.id,
      } as Partial<Endorsement>);
      toast.success("Endorsement created");
      setFormOpen(false);
      mutate();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    try { await endorsementService.approve(id, user.id); toast.success("Endorsed approved"); mutate(); }
    catch { toast.error("Failed"); }
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    try { await endorsementService.reject(id, user.id, "Rejected by manager"); toast.success("Endorsement rejected"); mutate(); }
    catch { toast.error("Failed"); }
  };

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live endorsement desk
            </div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.16em] text-foreground sm:text-3xl">
              Endorsements Command Center
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track policy amendment requests, approve pending changes, and monitor premium impact in one workflow.
            </p>
          </div>
          <motion.div {...hoverLift}>
            <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Endorsement</Button>
          </motion.div>
        </div>
      </section>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: FileCheck, label: "Total", value: endorsementStats.total, color: "text-blue-500" },
          { icon: Clock, label: "Pending", value: endorsementStats.pending, color: "text-amber-500" },
          { icon: CheckCircle, label: "Approved", value: endorsementStats.approved, color: "text-emerald-500" },
          { icon: XCircle, label: "Premium Impact", value: formatCurrency(endorsementStats.premiumChange), color: "text-rose-500" },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <MiniStat icon={item.icon} label={item.label} value={item.value} color={item.color} />
          </motion.div>
        ))}
      </motion.div>

      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search endorsement #, customer, policy..." value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }} className="border-border/80 bg-background/80 pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-full border-border/80 bg-background/80 sm:w-37.5"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, cfg]) => <SelectItem key={value} value={value}>{cfg.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/80 bg-muted/50"><FileCheck className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-muted-foreground text-sm">No endorsements found.</p>
        </div>
      ) : isMobile ? (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {paginated.map((endorsement) => (
            <motion.article key={endorsement.id} variants={staggerItem} {...hoverLift} className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/95 p-4 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-heading font-bold text-foreground">{endorsement.customer_name}</p>
                  <p className="font-mono text-xs text-primary">{endorsement.endorsement_number}</p>
                </div>
                <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[endorsement.status]?.color}`}>{STATUS_CONFIG[endorsement.status]?.label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p>Policy: <span className="text-foreground">{endorsement.policy_number || "-"}</span></p>
                <p>Type: <span className="capitalize text-foreground">{(endorsement.endorsement_type || "").replace(/_/g, " ")}</span></p>
                <p>Premium Diff: <span className="text-foreground">{endorsement.premium_difference ? formatCurrency(endorsement.premium_difference) : "-"}</span></p>
                <p>Date: <span className="text-foreground">{format(new Date(endorsement.createdAt), "dd MMM yyyy")}</span></p>
              </div>
              {isAdmin && endorsement.status === "pending" && (
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" onClick={() => handleApprove(endorsement.id)}>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" onClick={() => handleReject(endorsement.id)}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}
            </motion.article>
          ))}
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
          <Table>
            <TableHeader><TableRow className="border-border/80 bg-muted/20">
              <TableHead className="font-heading uppercase tracking-wider text-xs w-27.5">Endo #</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Customer</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Policy #</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Type</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Premium Diff</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Status</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Date</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs w-15"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paginated.map((endorsement) => (
                <TableRow key={endorsement.id} className="border-border/70 hover:bg-muted/35">
                  <TableCell className="font-mono text-xs text-primary">{endorsement.endorsement_number}</TableCell>
                  <TableCell className="font-medium">{endorsement.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{endorsement.policy_number || "-"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{(endorsement.endorsement_type || "").replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right">{endorsement.premium_difference ? formatCurrency(endorsement.premium_difference) : "-"}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${STATUS_CONFIG[endorsement.status]?.color}`}>{STATUS_CONFIG[endorsement.status]?.label}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(endorsement.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {isAdmin && endorsement.status === "pending" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleApprove(endorsement.id)}><CheckCircle className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-300" /> Approve</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReject(endorsement.id)}><XCircle className="mr-2 h-4 w-4 text-rose-600 dark:text-rose-300" /> Reject</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <section className="flex items-center justify-between rounded-xl border border-border/70 bg-card/80 px-3 py-2">
          <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</Button>
          </div>
        </section>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl border border-border-strong/70 bg-card/95">
          <DialogHeader><DialogTitle className="font-heading uppercase tracking-wider">New Endorsement</DialogTitle><DialogDescription>Select policy and request changes</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-full">
              <Label>Select Policy *</Label>
              <Popover open={policyOpen} onOpenChange={setPolicyOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={policyOpen} className="w-full justify-between border-border/80 bg-background/80">
                    {selectedPolicy ? `${selectedPolicy.policy_number} - ${selectedPolicy.customer_name}` : "Search policy..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) border-border bg-popover p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search policy..." />
                    <CommandList className="max-h-75">
                      <CommandEmpty>No active policy found.</CommandEmpty>
                      <CommandGroup>
                        {activePolicies?.map((policy) => (
                          <CommandItem
                            key={policy.id}
                            value={`${policy.policy_number} ${policy.customer_name} ${policy.policy_type}`}
                            onSelect={() => {
                              setSelectedPolicy(policy);
                              setPolicyOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedPolicy?.id === policy.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium">{policy.policy_number}</span>
                              <span className="text-xs text-muted-foreground">{policy.customer_name} • {policy.policy_type}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2"><Label>Customer Name *</Label><Input value={formData.customer_name} onChange={(event) => setFormData((data) => ({ ...data, customer_name: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Policy Number</Label><Input value={formData.policy_number} onChange={(event) => setFormData((data) => ({ ...data, policy_number: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={formData.endorsement_type} onValueChange={(value) => setFormData((data) => ({ ...data, endorsement_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Premium Difference</Label><Input type="number" value={formData.premium_difference} onChange={(event) => setFormData((data) => ({ ...data, premium_difference: event.target.value }))} /></div>
            <div className="space-y-2 col-span-full"><Label>Changes</Label><Textarea value={formData.changes} onChange={(event) => setFormData((data) => ({ ...data, changes: event.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.customer_name}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
