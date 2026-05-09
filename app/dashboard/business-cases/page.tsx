"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal,
  Eye,
  Sparkles,
  SearchX,
  Plus,
  LucideIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";

// Safe date formatter that handles null/undefined/invalid dates
function safeFormatDate(date: string | null | undefined, formatStr: string): string {
  if (!date) return "—";
  try {
    const parsed = typeof date === "string" ? parseISO(date) : new Date(date);
    if (!isValid(parsed)) return "—";
    return format(parsed, formatStr);
  } catch {
    return "—";
  }
}

// Safe status config lookup — returns a fallback for unknown/null statuses
function getStatusConfig(status: string | null | undefined) {
  if (!status) return { label: "Unknown", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: null };
  return STATUS_CONFIG[status as CaseStatus] ?? { label: status, color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: null };
}
import { useBusinessCases } from "@/lib/hooks/use-business-cases";
import { BusinessCase, CaseStatus } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG: Record<CaseStatus, { label: string; color: string; icon: LucideIcon | null }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock },
  processing: { label: "Processing", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: Sparkles },
  pending_customer: { label: "Pending Customer", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertCircle },
  pending_insurer: { label: "Pending Insurer", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertCircle },
  won: { label: "Won / Issued", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  lost: { label: "Lost", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: SearchX },
  done: { label: "Completed", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: SearchX },
};

export default function BusinessCasesPage() {
  const router = useRouter();
  const { data: businessCases, isLoading } = useBusinessCases();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredCases = useMemo(() => {
    if (!businessCases) return [];
    return (businessCases as BusinessCase[]).filter((bc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        bc.case_number.toLowerCase().includes(q) ||
        bc.customers?.name?.toLowerCase().includes(q) ||
        bc.lob.toLowerCase().includes(q);
      
      const matchesStatus = statusFilter === "all" || bc.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [businessCases, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!businessCases) return { total: 0, open: 0, urgent: 0, won: 0 };
    return {
      total: businessCases.length,
      open: businessCases.filter(c => c.status === 'open' || c.status === 'processing').length,
      won: businessCases.filter(c => c.status === 'won').length,
    };
  }, [businessCases]);

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6 pb-20" {...pageTransition}>
      {/* Premium Header Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 p-10 shadow-2xl shadow-primary/5">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <Sparkles className="h-3 w-3" />
              Unified Case Management
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-heading sm:text-5xl">
              Business <span className="text-primary italic">Cases</span>
            </h1>
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              Track policy issuance, renewals, and claims lifecycle in a unified workflow. Every intake starts here.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => router.push("/dashboard/intake")} 
              className="h-14 rounded-2xl px-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 font-bold"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Intake
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Quick Grid */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Active Pipelines", value: stats.open, color: "text-blue-500", bg: "bg-blue-500/5", icon: Clock },
          { label: "Success Rate", value: stats.total ? `${Math.round((stats.won / stats.total) * 100)}%` : "0%", color: "text-emerald-500", bg: "bg-emerald-500/5", icon: CheckCircle2 },
          { label: "Total Cases", value: stats.total, color: "text-indigo-500", bg: "bg-indigo-500/5", icon: Sparkles },
          { label: "SLA Compliant", value: "94%", color: "text-amber-500", bg: "bg-amber-500/5", icon: AlertCircle },
        ].map((stat, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Card className={cn("border-none shadow-sm h-full", stat.bg)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <p className={cn("text-3xl font-bold tracking-tight", stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters & Search */}
      <section className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search by case #, customer name, or lob..." 
            className="h-12 pl-11 rounded-2xl border-border bg-card/50 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-52 h-12 rounded-2xl border-border bg-card/50">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border">
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Main Listing Table */}
      <div className="rounded-[2rem] border border-border bg-card/40 overflow-hidden shadow-xl shadow-black/5">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-none">
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">Case Details</TableHead>
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">Customer</TableHead>
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">LOB / Type</TableHead>
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">Created</TableHead>
              <TableHead className="py-5 text-right font-bold uppercase tracking-wider text-[10px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-6"><Skeleton className="h-10 w-32 rounded-lg" /></TableCell>
                  <TableCell className="py-6"><Skeleton className="h-10 w-48 rounded-lg" /></TableCell>
                  <TableCell className="py-6"><Skeleton className="h-10 w-24 rounded-lg" /></TableCell>
                  <TableCell className="py-6"><Skeleton className="h-10 w-28 rounded-lg" /></TableCell>
                  <TableCell className="py-6"><Skeleton className="h-10 w-32 rounded-lg" /></TableCell>
                  <TableCell className="py-6"><Skeleton className="h-10 w-10 ml-auto rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : filteredCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                    <SearchX className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-medium">No business cases found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCases.map((bc) => (
                <TableRow 
                  key={bc.id} 
                  className="group hover:bg-primary/5 transition-colors cursor-pointer border-border/50"
                  onClick={() => router.push(`/dashboard/business-cases/${bc.id}`)}
                >
                  <TableCell className="py-6">
                    <div className="flex flex-col">
                      <span className="font-black font-mono text-primary text-xs">{bc.case_number}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5 tracking-tighter">Priority: {bc.priority}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex flex-col">
                      <span className="font-bold">{bc.customers?.name || "N/A"}</span>
                      <span className="text-xs text-muted-foreground">{bc.customers?.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex flex-col">
                      <span className="font-bold capitalize">{bc.lob.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground capitalize opacity-70">{bc.case_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge variant="outline" className={cn("rounded-lg px-2 py-1 flex items-center gap-1.5 w-fit border-2", getStatusConfig(bc.status).color)}>
                      {(() => {
                        const Icon = getStatusConfig(bc.status).icon;
                        return Icon ? <Icon className="h-3 w-3" /> : null;
                      })()}
                      <span className="text-[10px] font-black uppercase tracking-tight">{getStatusConfig(bc.status).label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6">
                    <span className="text-sm text-muted-foreground">
                      {safeFormatDate(bc.createdAt, "dd MMM yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="py-6 text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-card">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-border p-2 min-w-40">
                        <DropdownMenuItem className="rounded-xl py-3 cursor-pointer" onClick={() => router.push(`/dashboard/business-cases/${bc.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem className="rounded-xl py-3 cursor-pointer">
                          <AlertCircle className="h-4 w-4 mr-2" /> Change Status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
