"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Target,
  Phone,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  UserCheck,
  Loader2,
  CalendarClock,
  X,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { useLeads, invalidateLeads } from "@/lib/hooks/use-leads";
import { useActiveUsers } from "@/lib/hooks/use-settings";
import { deleteLead } from "@/lib/services/lead.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { SalesLead } from "@/lib/types";
import { hoverLift, pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import {
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
  CLIENT_TYPE_OPTIONS,
} from "@/lib/validations/lead";
import { generateLeadWhatsAppLink } from "@/lib/helpers/whatsapp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const PAGE_SIZE = 20;

export default function SalesLeadsPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { data: leads, isLoading } = useLeads(
    role === "employee" && user
      ? [{ field: "assigned_to", operator: "==" as const, value: user.id }]
      : undefined
  );
  const { data: users } = useActiveUsers();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("all");
  const [salespersonFilter, setSalespersonFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [estValueMin, setEstValueMin] = useState<string>("");
  const [estValueMax, setEstValueMax] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<SalesLead | null>(null);
  const [deletingLead, setDeletingLead] = useState<SalesLead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter leads
  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          lead.customer_name.toLowerCase().includes(q) ||
          lead.lead_number.toLowerCase().includes(q) ||
          lead.mobile.includes(q) ||
          lead.email?.toLowerCase().includes(q) ||
          lead.assigned_to_name?.toLowerCase().includes(q) ||
          lead.poc_name?.toLowerCase().includes(q) ||
          lead.location?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Status filter
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      // Source filter
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      // Priority filter
      if (priorityFilter !== "all" && lead.priority !== priorityFilter) return false;
      // Client type filter
      if (clientTypeFilter !== "all" && lead.client_type !== clientTypeFilter) return false;
      // Salesperson filter
      if (salespersonFilter !== "all" && lead.assigned_to !== salespersonFilter) return false;
      // Date range filter (on lead_date)
      if (dateFrom && lead.lead_date && lead.lead_date < dateFrom) return false;
      if (dateTo && lead.lead_date && lead.lead_date > dateTo) return false;
      // Estimated value range filter
      if (estValueMin && (lead.estimated_value ?? 0) < parseFloat(estValueMin)) return false;
      if (estValueMax && (lead.estimated_value ?? 0) > parseFloat(estValueMax)) return false;
      return true;
    });
  }, [leads, searchQuery, statusFilter, sourceFilter, priorityFilter, clientTypeFilter, salespersonFilter, dateFrom, dateTo, estValueMin, estValueMax]);

  const hasSearch = searchQuery.trim().length > 0;
  const hasActiveFilters =
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    priorityFilter !== "all" ||
    clientTypeFilter !== "all" ||
    salespersonFilter !== "all" ||
    dateFrom ||
    dateTo ||
    estValueMin ||
    estValueMax;

  const clearAllFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setPriorityFilter("all");
    setClientTypeFilter("all");
    setSalespersonFilter("all");
    setDateFrom("");
    setDateTo("");
    setEstValueMin("");
    setEstValueMax("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activePipelineCount = useMemo(
    () =>
      filtered.filter(
        (lead) => !["converted", "lost", "not_interested"].includes(lead.status)
      ).length,
    [filtered]
  );

  const hotLeadsCount = useMemo(
    () => filtered.filter((lead) => lead.priority === "high" || lead.priority === "urgent").length,
    [filtered]
  );

  const followUpDueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filtered.filter((lead) => {
      if (!lead.follow_up_date) return false;
      if (["converted", "lost", "not_interested"].includes(lead.status)) return false;
      const followUpDate = new Date(lead.follow_up_date);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate <= today;
    }).length;
  }, [filtered]);

  const handleDelete = async () => {
    if (!deletingLead || !user) return;
    setDeleting(true);
    try {
      await deleteLead(deletingLead.id, user.id);
      await auditLogService.logAction(
        user.id,
        user.name,
        "delete",
        "sales-leads",
        `Deleted lead: ${deletingLead.lead_number} — ${deletingLead.customer_name}`
      );
      toast.success("Lead deleted");
      invalidateLeads();
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setDeleting(false);
      setDeletingLead(null);
    }
  };

  const handleEdit = (lead: SalesLead) => {
    setEditLead(lead);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditLead(null);
    setFormOpen(true);
  };

  const canEdit = role === "admin" || role === "manager" || role === "employee";
  const canDelete = role === "admin";

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-5"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <section className="rounded-[2rem] border border-border bg-card/85 p-6 shadow-[0_12px_28px_rgba(47,62,64,0.05)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Pipeline Desk
            </p>
            <h1 className="mt-2 text-3xl font-heading font-bold tracking-tight text-foreground">
              Sales Leads
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""}{" "}
              {hasSearch ? "matched search" : hasActiveFilters ? "after filters" : "in your workspace"}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3 w-3" />
              Premium pipeline view
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(hasSearch || hasActiveFilters) && (
              <motion.div {...hoverLift}>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="gap-2 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              </motion.div>
            )}
            {canEdit && (
              <motion.div {...hoverLift}>
                <Button onClick={handleAddNew} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  Add Lead
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card/90 p-4 shadow-[0_8px_18px_rgba(47,62,64,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, lead #, phone, POC, location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border-border bg-muted/35 pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full border-border bg-card lg:w-42.5">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {LEAD_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(v) => {
              setSourceFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full border-border bg-card lg:w-42.5">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {LEAD_SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(v) => {
              setPriorityFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full border-border bg-card lg:w-42.5">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {LEAD_PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row">
          <Select
            value={clientTypeFilter}
            onValueChange={(v) => {
              setClientTypeFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full border-border bg-card xl:w-42.5">
              <SelectValue placeholder="Client Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CLIENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {role !== "employee" && users && (
            <Select
              value={salespersonFilter}
              onValueChange={(v) => {
                setSalespersonFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full border-border bg-card xl:w-55">
                <SelectValue placeholder="Salesperson" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Salespersons</SelectItem>
                {users.map((currentUser) => (
                  <SelectItem key={currentUser.id} value={currentUser.id}>
                    {currentUser.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex flex-1 items-center gap-2 xl:flex-none">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 border-border bg-card text-sm xl:w-40"
              placeholder="From"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 border-border bg-card text-sm xl:w-40"
              placeholder="To"
            />
          </div>

          <div className="flex flex-1 items-center gap-2 xl:flex-none">
            <Input
              type="number"
              min={0}
              value={estValueMin}
              onChange={(e) => {
                setEstValueMin(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border-border bg-card text-sm xl:w-35"
              placeholder="Min value"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="number"
              min={0}
              value={estValueMax}
              onChange={(e) => {
                setEstValueMax(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border-border bg-card text-sm xl:w-35"
              placeholder="Max value"
            />
          </div>
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <motion.div variants={staggerItem} {...hoverLift} className="rounded-xl border border-border bg-card/85 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Visible Leads</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{filtered.length}</p>
        </motion.div>
        <motion.div variants={staggerItem} {...hoverLift} className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Active Pipeline</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-primary">{activePipelineCount}</p>
        </motion.div>
        <motion.div
          variants={staggerItem}
          {...hoverLift}
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">High Priority</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-amber-700 dark:text-amber-300">{hotLeadsCount}</p>
        </motion.div>
        <motion.div
          variants={staggerItem}
          {...hoverLift}
          className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">Follow-Up Due</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-rose-700 dark:text-rose-300">{followUpDueCount}</p>
        </motion.div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl bg-skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-border bg-card/90 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {hasSearch || hasActiveFilters
              ? "No leads match your filters."
              : "No leads yet. Add your first lead!"}
          </p>
          {canEdit && !hasSearch && !hasActiveFilters && (
            <Button onClick={handleAddNew} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      ) : isMobile ? (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {paginated.map((lead) => (
            <motion.article
              key={lead.id}
              variants={staggerItem}
              {...hoverLift}
              className="space-y-3 rounded-2xl border border-border bg-card/90 p-4 shadow-[0_8px_18px_rgba(47,62,64,0.04)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-bold text-foreground">{lead.customer_name}</p>
                  <p className="mt-0.5 font-mono text-xs text-primary">{lead.lead_number}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Lead actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/sales-leads/${lead.id}`)}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => handleEdit(lead)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingLead(lead)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2">
                <LeadStatusBadge status={lead.status} />
                <LeadPriorityBadge priority={lead.priority} />
                <LeadSourceBadge source={lead.source} />
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground">
                <a href={`tel:${lead.mobile}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {lead.mobile}
                </a>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5" /> {lead.assigned_to_name || "Unassigned"}
                </div>
                {lead.follow_up_date && (
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {format(new Date(lead.follow_up_date), "dd MMM yyyy")}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <a
                  href={generateLeadWhatsAppLink({
                    customerName: lead.customer_name,
                    customerPhone: lead.mobile,
                    messageType: "thank_you",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <a
                  href={`tel:${lead.mobile}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-1.5 text-xs text-blue-700 dark:text-blue-300"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              </div>
            </motion.article>
          ))}
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_8px_18px_rgba(47,62,64,0.04)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-27.5 font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Lead #</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Customer</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Mobile</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Source</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Assigned To</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Priority</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
                <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Follow-Up</TableHead>
                <TableHead className="w-20 font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer border-border/70 hover:bg-muted/35"
                  onClick={() => router.push(`/dashboard/sales-leads/${lead.id}`)}
                >
                  <TableCell className="font-mono text-xs text-primary">{lead.lead_number}</TableCell>
                  <TableCell className="font-medium text-foreground">{lead.customer_name}</TableCell>
                  <TableCell>{lead.mobile}</TableCell>
                  <TableCell>
                    <LeadSourceBadge source={lead.source} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.assigned_to_name || "-"}</TableCell>
                  <TableCell>
                    <LeadPriorityBadge priority={lead.priority} />
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.follow_up_date ? format(new Date(lead.follow_up_date), "dd MMM yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => event.stopPropagation()}
                          aria-label="Lead actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/dashboard/sales-leads/${lead.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEdit(lead);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeletingLead(lead);
                              }}
                              className="text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <section className="flex items-center justify-between rounded-xl border border-border bg-card/80 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Next
            </Button>
          </div>
        </section>
      )}

      <LeadForm open={formOpen} onOpenChange={setFormOpen} editData={editLead} />

      <AlertDialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingLead?.lead_number}</strong> - {deletingLead?.customer_name}?
              This action can be undone by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
