"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, Upload, Users, Building2, User, MoreHorizontal,
  Eye, Pencil, Trash2, Copy, Check, Loader2, ChevronDown,
  UserPlus, Filter, X, RefreshCw, Download, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/context/auth-context";
import { useCustomers, invalidateCustomers } from "@/lib/hooks/use-customers";
import { customerService } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { Customer, ClientType } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { useIsMobile } from "@/lib/hooks/use-media-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerLookup } from "@/components/customers/customer-lookup";
import { CustomerBulkImport } from "@/components/customers/customer-bulk-import";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  corporate: "Corporate",
  sme: "SME",
  government: "Government",
  contractor: "Contractor",
  manufacturer: "Manufacturer",
  transporter: "Transporter",
  trader: "Trader",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  individual: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  corporate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sme: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  government: "bg-green-500/10 text-green-400 border-green-500/20",
  contractor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  manufacturer: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  transporter: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  trader: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  other: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const KYC_COLORS: Record<string, string> = {
  verified: "bg-green-500/10 text-green-400",
  pending: "bg-amber-500/10 text-amber-400",
  rejected: "bg-red-500/10 text-red-400",
  expired: "bg-gray-500/10 text-gray-400",
};

export default function CustomersPage() {
  const { role } = useAuth();
  if (role === "employee") return <CustomerLookup />;
  return <CustomerListView />;
}

function CustomerListView() {
  const router = useRouter();
  const { role, session, user } = useAuth();
  const { data: customers, isLoading } = useCustomers();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [formOpen, setFormOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedUID, setCopiedUID] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);

  // Compute metrics
  const metrics = useMemo(() => {
    if (!customers) return { total: 0, active: 0, individual: 0, corporate: 0, sme: 0, other: 0 };
    const all = customers;
    return {
      total: all.length,
      active: all.filter(c => !c.status || c.status === "active").length,
      individual: all.filter(c => c.type === "individual").length,
      corporate: all.filter(c => c.type === "corporate").length,
      sme: all.filter(c => c.type === "sme").length,
      other: all.filter(c => !["individual", "corporate", "sme"].includes(c.type)).length,
    };
  }, [customers]);

  // Filter customers
  const filtered = useMemo(() => {
    if (!customers) return [];
    let list = customers;

    // Status filter
    if (!showInactive) {
      list = list.filter(c => !c.status || c.status === "active");
    }

    // Type filter
    if (typeFilter !== "all") {
      list = list.filter(c => c.type === typeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.uid?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [customers, searchQuery, typeFilter, showInactive]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCopyUID = async (uid: string) => {
    await navigator.clipboard.writeText(uid);
    setCopiedUID(uid);
    toast.success("UID copied");
    setTimeout(() => setCopiedUID(null), 2000);
  };

  const handleDelete = async () => {
    if (!deleteCustomer || !user) return;
    setDeleting(true);
    try {
      try {
        const token = session?.access_token;
        if (token) {
          await fetch(`/api/customers/${deleteCustomer.id}/deactivate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
        }
      } catch { /* non-critical */ }

      const cascade = await customerService.deleteWithCascade(deleteCustomer.id, user.id);
      const parts = [
        cascade.cancelledPolicies && `${cascade.cancelledPolicies} policy(ies)`,
        cascade.cancelledPremiums && `${cascade.cancelledPremiums} premium(s)`,
        cascade.rejectedCommissions && `${cascade.rejectedCommissions} commission(s)`,
        cascade.lostRenewals && `${cascade.lostRenewals} renewal(s)`,
      ].filter(Boolean);
      const msg = parts.length ? ` — also affected ${parts.join(", ")}` : "";
      await auditLogService.logAction(user.id, user.name, "deactivate", "customer",
        `Deactivated customer: ${deleteCustomer.name} (${deleteCustomer.uid})${msg}`);
      toast.success(`Customer deactivated${msg}`);
      invalidateCustomers();
    } catch {
      toast.error("Failed to deactivate");
    } finally {
      setDeleting(false);
      setDeleteCustomer(null);
    }
  };

  const handleExport = () => {
    const rows = [
      ["UID", "Name", "Type", "Phone", "Email", "City", "State", "KYC Status", "Status"],
      ...filtered.map(c => [
        c.uid, c.name, c.type || "individual", c.phone, c.email,
        c.city || "", c.state || "", c.kyc_status || "pending", c.status || "active",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} customers`);
  };

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            All Entities
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified customer registry — {metrics.total} total entities
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          {(role === "admin" || role === "manager") && (
            <Button variant="outline" size="sm" onClick={() => setBulkImportOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Bulk Import
            </Button>
          )}
          {(role === "admin" || role === "manager") && (
            <Button size="sm" onClick={() => router.push("/dashboard/customers/new")} className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: metrics.total, icon: Users, color: "text-foreground" },
          { label: "Active", value: metrics.active, icon: Check, color: "text-green-400" },
          { label: "Individual", value: metrics.individual, icon: User, color: "text-blue-400" },
          { label: "Corporate", value: metrics.corporate, icon: Building2, color: "text-amber-400" },
          { label: "SME", value: metrics.sme, icon: Building2, color: "text-purple-400" },
          { label: "Other", value: metrics.other, icon: Users, color: "text-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{isLoading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, UID, phone, email, city..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Show inactive toggle */}
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
          className="gap-2 whitespace-nowrap"
        >
          <Filter className="w-4 h-4" />
          {showInactive ? "Hiding Inactive" : "Show Inactive"}
        </Button>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 flex-wrap">
        {["all", "individual", "corporate", "sme", "government", "contractor", "other"].map(t => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {t === "all" ? "All" : TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Users className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== "all" ? "No customers match your filters." : "No customers yet."}
            </p>
            {(role === "admin" || role === "manager") && (
              <Button onClick={() => router.push("/dashboard/customers/new")} className="gap-2">
                <UserPlus className="w-4 h-4" /> Add First Customer
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">UID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Phone</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">City</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden lg:table-cell">KYC</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden xl:table-cell">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(customer => (
                <TableRow
                  key={customer.id}
                  className="border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                >
                  <TableCell>
                    <button
                      onClick={e => { e.stopPropagation(); handleCopyUID(customer.uid); }}
                      className="flex items-center gap-1.5 group"
                    >
                      <Badge variant="secondary" className="font-mono text-primary bg-primary/10 text-xs">
                        {customer.uid}
                      </Badge>
                      {copiedUID === customer.uid
                        ? <Check className="w-3 h-3 text-green-400" />
                        : <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {customer.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <span className="font-medium text-sm truncate max-w-[160px]">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={`text-xs ${TYPE_COLORS[customer.type] || TYPE_COLORS.other}`}>
                      {TYPE_LABELS[customer.type] || customer.type || "Individual"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {customer.phone}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {customer.city || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className={`text-xs ${KYC_COLORS[customer.kyc_status || "pending"]}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {customer.kyc_status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge variant="outline" className={`text-xs ${
                      customer.status === "inactive"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}>
                      {customer.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/customers/${customer.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> View 360
                        </DropdownMenuItem>
                        {(role === "admin" || role === "manager") && (
                          <DropdownMenuItem onClick={() => { setEditCustomer(customer); setFormOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/policies?customer=${customer.id}`)}>
                          <Plus className="w-4 h-4 mr-2" /> Create Policy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {role === "admin" && (
                          <DropdownMenuItem
                            onClick={() => setDeleteCustomer(customer)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <CustomerForm
        open={formOpen}
        onOpenChange={open => { setFormOpen(open); if (!open) setEditCustomer(null); }}
        editData={editCustomer}
        onSuccess={() => { setFormOpen(false); setEditCustomer(null); }}
      />

      {/* Bulk import */}
      <CustomerBulkImport open={bulkImportOpen} onOpenChange={setBulkImportOpen} />

      {/* Deactivate confirmation */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={open => !open && setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">Deactivate Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate <strong>{deleteCustomer?.name}</strong> ({deleteCustomer?.uid})?
              This will cancel active policies, pending premiums, commissions, and renewals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
