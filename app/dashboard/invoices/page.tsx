"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Receipt,
  Eye,
  MoreHorizontal,
  Loader2,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ChevronsUpDown,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/context/auth-context";
import { useInvoices, useInvoiceStats } from "@/lib/hooks/use-invoices";
import { invoiceService } from "@/lib/services/invoice.service";
import { useSettings } from "@/lib/hooks/use-settings";
import { MiniStat } from "@/components/dashboard/mini-stat";
import type { Invoice, InvoiceStatus, Customer } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { formatCurrency, cn } from "@/lib/utils";
import { useCustomers } from "@/lib/hooks/use-customers";
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

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300" },
  sent: { label: "Sent", color: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  paid: { label: "Paid", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  partially_paid: { label: "Partial", color: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  overdue: { label: "Overdue", color: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  cancelled: { label: "Cancelled", color: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  refunded: { label: "Refunded", color: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
};

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { data: invoices, isLoading, mutate } = useInvoices();
  const { data: stats } = useInvoiceStats();
  const { data: settings } = useSettings();
  const isMobile = useIsMobile();
  const { data: customers } = useCustomers();

  // Derive settings values
  const settingsMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of settings || []) m[s.key] = String(s.value ?? "");
    return m;
  }, [settings]);
  const invoicePrefix = settingsMap["invoice_prefix"] || "INV";
  const dueDays = parseInt(settingsMap["default_invoice_due_days"] || "15", 10);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ invoice_number: "", customer_name: "", subtotal: "", tax_rate: "18", due_date: "", notes: "", terms: "" });
  const isAdmin = role === "admin" || role === "manager";

  // Customer selector state
  const [customerOpen, setCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Auto-fill customer name when selected
  useEffect(() => {
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        customer_name: selectedCustomer.name,
      }));
    }
  }, [selectedCustomer]);

  // Auto-fill invoice_number + due_date when dialog opens
  useEffect(() => {
    if (!formOpen) return;
    invoiceService.getNextNumber(invoicePrefix).then((num) => {
      const dueDate = invoiceService.calcDueDate(dueDays);
      setFormData((d) => ({ ...d, invoice_number: num, due_date: dueDate }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen]);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!inv.customer_name.toLowerCase().includes(q) && !inv.invoice_number.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      return true;
    });
  }, [invoices, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreate = async () => {
    if (!user || !formData.customer_name || !formData.subtotal) return;
    setSaving(true);
    try {
      await invoiceService.create({
        invoice_number: formData.invoice_number || undefined,
        customer_name: formData.customer_name,
        subtotal: parseFloat(formData.subtotal),
        tax_rate: parseFloat(formData.tax_rate || "18"),
        due_date: formData.due_date || undefined,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        created_by: user.id,
      });
      toast.success("Invoice created");
      setFormOpen(false);
      setFormData({ invoice_number: "", customer_name: "", subtotal: "", tax_rate: "18", due_date: "", notes: "", terms: "" });
      mutate();
    } catch { toast.error("Failed to create invoice"); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    try {
      await invoiceService.markAsPaid(inv.id);
      toast.success("Invoice marked as paid");
      mutate();
    } catch { toast.error("Failed to update"); }
  };

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live billing desk
            </div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.16em] text-foreground sm:text-3xl">
              Invoices Command Center
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Create, track, and close customer invoices with clear payment visibility and quick reconciliation actions.
            </p>
          </div>
          {isAdmin && (
            <motion.div {...hoverLift}>
              <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
            </motion.div>
          )}
        </div>
      </section>

      {stats && isAdmin && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { icon: Receipt, label: "Total Invoices", value: stats.total, color: "text-blue-500" },
            { icon: DollarSign, label: "Total Amount", value: formatCurrency(stats.totalAmount), color: "text-indigo-500" },
            { icon: CheckCircle2, label: "Paid", value: formatCurrency(stats.paidAmount), color: "text-emerald-500" },
            { icon: AlertTriangle, label: "Pending", value: formatCurrency(stats.pendingAmount), color: "text-rose-500" },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <MiniStat icon={item.icon} label={item.label} value={item.value} color={item.color} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice #, customer..."
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }}
              className="border-border/80 bg-background/80 pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-full border-border/80 bg-background/80 sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, cfg]) => <SelectItem key={value} value={value}>{cfg.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-3">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/80 bg-muted/50"><Receipt className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-sm text-muted-foreground">{searchQuery ? "No invoices match." : "No invoices yet."}</p>
        </div>
      ) : isMobile ? (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {paginated.map((invoice) => (
            <motion.article
              key={invoice.id}
              variants={staggerItem}
              {...hoverLift}
              className="cursor-pointer space-y-3 rounded-2xl border border-border-strong/70 bg-card/95 p-4 shadow-[0_10px_24px_rgba(47,62,64,0.06)]"
              onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-bold text-foreground">{invoice.customer_name}</p>
                  <p className="font-mono text-xs text-primary">{invoice.invoice_number}</p>
                </div>
                <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[invoice.status]?.color}`}>{STATUS_CONFIG[invoice.status]?.label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p>Subtotal: <span className="text-foreground">{formatCurrency(invoice.subtotal)}</span></p>
                <p>Total: <span className="text-foreground">{formatCurrency(invoice.total_amount)}</span></p>
                <p>Balance: {invoice.balance_due && invoice.balance_due > 0 ? <span className="text-rose-700 dark:text-rose-300">{formatCurrency(invoice.balance_due)}</span> : <span className="text-emerald-700 dark:text-emerald-300">Paid</span>}</p>
                <p>Due: <span className="text-foreground">{invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "-"}</span></p>
              </div>
              <div className="flex items-center justify-end gap-2">
                {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMarkPaid(invoice);
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Paid
                  </Button>
                )}
              </div>
            </motion.article>
          ))}
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
          <Table>
            <TableHeader><TableRow className="border-border/80 bg-muted/20">
              <TableHead className="font-heading uppercase tracking-wider text-xs w-27.5">Invoice #</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Customer</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Subtotal</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Tax</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Total</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Balance</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Status</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Due Date</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs w-15"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paginated.map((invoice) => (
                <TableRow key={invoice.id} className="cursor-pointer border-border/70 hover:bg-muted/35" onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}>
                  <TableCell className="font-mono text-xs text-primary">{invoice.invoice_number}</TableCell>
                  <TableCell className="font-medium">{invoice.customer_name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(invoice.subtotal)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(invoice.tax_amount || 0)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(invoice.total_amount)}</TableCell>
                  <TableCell className="text-right">{invoice.balance_due && invoice.balance_due > 0 ? <span className="text-rose-700 dark:text-rose-300">{formatCurrency(invoice.balance_due)}</span> : <span className="text-emerald-700 dark:text-emerald-300">Paid</span>}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${STATUS_CONFIG[invoice.status]?.color}`}>{STATUS_CONFIG[invoice.status]?.label}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(event) => event.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(event) => { event.stopPropagation(); router.push(`/dashboard/invoices/${invoice.id}`); }}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                        {invoice.status !== "paid" && invoice.status !== "cancelled" && <DropdownMenuItem onClick={(event) => { event.stopPropagation(); handleMarkPaid(invoice); }}><CheckCircle2 className="mr-2 h-4 w-4" /> Mark Paid</DropdownMenuItem>}
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
          <DialogHeader><DialogTitle className="font-heading uppercase tracking-wider">New Invoice</DialogTitle><DialogDescription>Select customer and enter invoice details</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={formData.invoice_number} onChange={(event) => setFormData((data) => ({ ...data, invoice_number: event.target.value }))} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Auto-generated from prefix: <strong>{invoicePrefix}</strong></p>
            </div>
            <div className="space-y-2"><Label>Customer Name *</Label><Input value={formData.customer_name} onChange={(event) => setFormData((data) => ({ ...data, customer_name: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Subtotal *</Label><Input type="number" value={formData.subtotal} onChange={(event) => setFormData((data) => ({ ...data, subtotal: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={formData.tax_rate} onChange={(event) => setFormData((data) => ({ ...data, tax_rate: event.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={formData.due_date} onChange={(event) => setFormData((data) => ({ ...data, due_date: event.target.value }))} />
              <p className="text-xs text-muted-foreground">Default: {dueDays} days from today</p>
            </div>
            <div className="space-y-2 col-span-full"><Label>Notes</Label><Textarea value={formData.notes} onChange={(event) => setFormData((data) => ({ ...data, notes: event.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.customer_name || !formData.subtotal}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
