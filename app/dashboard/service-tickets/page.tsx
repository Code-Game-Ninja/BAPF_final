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
  LifeBuoy,
  History,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useServiceTickets } from "@/lib/hooks/use-business-cases";
import { TicketStatus, TicketPriority, ServiceTicket } from "@/lib/types";
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
import { LucideIcon } from "lucide-react";

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: LucideIcon }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: Sparkles },
  pending: { label: "Pending", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Clock },
  pending_customer: { label: "Pending Customer", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertCircle },
  resolved: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: History },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "text-slate-400" },
  medium: { label: "Medium", color: "text-amber-500" },
  high: { label: "High", color: "text-orange-500" },
  urgent: { label: "Urgent", color: "text-rose-500" },
};

export default function ServiceTicketsPage() {
  const router = useRouter();
  const { data: tickets, isLoading } = useServiceTickets();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        t.ticket_number.toLowerCase().includes(q) ||
        t.customers?.name?.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, open: 0, urgent: 0 };
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length,
    };
  }, [tickets]);

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6 pb-20" {...pageTransition}>
      {/* Premium Header Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 p-10 shadow-2xl shadow-primary/5">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-500 text-[10px] font-black uppercase tracking-[0.2em]">
              <LifeBuoy className="h-3 w-3" />
              Service Excellence Desk
            </div>
            <h1 className="text-4xl font-bold tracking-tighter font-heading sm:text-5xl">
              Service <span className="text-purple-500 italic">Tickets</span>
            </h1>
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              Resolve support requests, endorsement updates, and claims queries with tracked SLAs and multi-agent coordination.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button 
               onClick={() => router.push("/dashboard/intake")} 
               variant="outline"
               className="h-14 rounded-2xl px-8 border-border hover:bg-card shadow-xl shadow-black/5 font-bold"
            >
              Raise Service Intake
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
          { label: "Active Tickets", value: stats.open, color: "text-blue-500", bg: "bg-blue-500/5", icon: Clock },
          { label: "Urgent Action", value: stats.urgent, color: "text-rose-500", bg: "bg-rose-500/5", icon: AlertTriangle },
          { label: "Total Handled", value: stats.total, color: "text-purple-500", bg: "bg-purple-500/5", icon: LifeBuoy },
          { label: "Avg Resolution", value: "4.2h", color: "text-emerald-500", bg: "bg-emerald-500/5", icon: CheckCircle2 },
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-purple-500 transition-colors" />
          <Input 
            placeholder="Search by ticket #, customer, or category..." 
            className="h-12 pl-11 rounded-2xl border-border bg-card/50 focus:ring-purple-500/20 transition-all"
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
            {(Object.entries(STATUS_CONFIG) as [TicketStatus, typeof STATUS_CONFIG[TicketStatus]][]).map(([key, val]) => (
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
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">Ticket Details</TableHead>
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">Customer</TableHead>
              <TableHead className="py-5 font-bold uppercase tracking-wider text-[10px]">Priority</TableHead>
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
            ) : filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                    <LifeBuoy className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-medium">No service tickets found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((t) => (
                <TableRow 
                  key={t.id} 
                  className="group hover:bg-purple-500/5 transition-colors cursor-pointer border-border/50"
                  onClick={() => router.push(`/dashboard/service-tickets/${t.id}`)}
                >
                  <TableCell className="py-6">
                    <div className="flex flex-col">
                      <span className="font-black font-mono text-purple-600 text-xs">{t.ticket_number}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5 tracking-tighter capitalize">{t.category.replace(/_/g, ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex flex-col">
                      <span className="font-bold">{t.customers?.name || "N/A"}</span>
                      <span className="text-xs text-muted-foreground">{t.customers?.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-1.5 w-1.5 rounded-full", t.priority === 'urgent' ? 'bg-rose-500' : t.priority === 'high' ? 'bg-orange-500' : 'bg-slate-400')} />
                      <span className={cn("text-xs font-bold uppercase tracking-tight", PRIORITY_CONFIG[t.priority]?.color)}>{PRIORITY_CONFIG[t.priority]?.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge variant="outline" className={cn("rounded-lg px-2 py-1 flex items-center gap-1.5 w-fit border-2", STATUS_CONFIG[t.status]?.color)}>
                      {(() => {
                        const Icon = STATUS_CONFIG[t.status]?.icon;
                        return Icon ? <Icon className="h-3 w-3" /> : null;
                      })()}
                      <span className="text-[10px] font-black uppercase tracking-tight">{STATUS_CONFIG[t.status]?.label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6">
                    <span className="text-sm text-muted-foreground">{format(new Date(t.createdAt), "dd MMM yyyy")}</span>
                  </TableCell>
                  <TableCell className="py-6 text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-card">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-border p-2 min-w-40">
                        <DropdownMenuItem className="rounded-xl py-3 cursor-pointer" onClick={() => router.push(`/dashboard/service-tickets/${t.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> View Ticket
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem className="rounded-xl py-3 cursor-pointer">
                          <ArrowUpRight className="h-4 w-4 mr-2" /> Assign Agent
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
