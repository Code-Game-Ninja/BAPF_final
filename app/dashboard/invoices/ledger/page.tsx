"use client";

import { useState, useMemo } from "react";
import { Search, DollarSign, TrendingUp, TrendingDown, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/lib/context/auth-context";
import { useLedgerEntries, useLedgerBalance } from "@/lib/hooks/use-invoices";
import { ledgerService } from "@/lib/services/invoice.service";
import { MiniStat } from "@/components/dashboard/mini-stat";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LedgerPage() {
  const { user } = useAuth();
  const { data: entries, isLoading, mutate } = useLedgerEntries();
  const { data: balance } = useLedgerBalance();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ customer_name: "", entry_type: "debit", category: "premium", amount: "", description: "", entry_date: "" });

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => {
      if (typeFilter !== "all" && e.entry_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!(e.customer_name?.toLowerCase() || "").includes(q) && !(e.description?.toLowerCase() || "").includes(q)) return false;
      }
      return true;
    });
  }, [entries, searchQuery, typeFilter]);

  const handleCreate = async () => {
    if (!user || !formData.amount || !formData.customer_name) return;
    setSaving(true);
    try {
      await ledgerService.create({
        ...formData,
        amount: parseFloat(formData.amount),
        entry_date: formData.entry_date || new Date().toISOString().split("T")[0],
        created_by: user.id,
      } as Record<string, unknown>);
      toast.success("Ledger entry created");
      setFormOpen(false);
      setFormData({ customer_name: "", entry_type: "debit", category: "premium", amount: "", description: "", entry_date: "" });
      mutate();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider">Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} entries</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> New Entry</Button>
      </div>

      {balance && (
        <div className="grid grid-cols-3 gap-3">
          <MiniStat icon={TrendingUp} label="Total Debits" value={formatCurrency(balance.debits)} color="text-red-400" />
          <MiniStat icon={TrendingDown} label="Total Credits" value={formatCurrency(balance.credits)} color="text-green-400" />
          <MiniStat icon={DollarSign} label="Net Balance" value={formatCurrency(balance.balance)} color={balance.balance >= 0 ? "text-green-400" : "text-red-400"} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="debit">Debits</SelectItem>
            <SelectItem value="credit">Credits</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center"><DollarSign className="w-8 h-8 text-muted-foreground" /></div>
          <p className="text-muted-foreground text-sm">No ledger entries found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Date</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Customer</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Category</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Description</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs">Type</TableHead>
              <TableHead className="font-heading uppercase tracking-wider text-xs text-right">Amount</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(e.entry_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{e.customer_name || "—"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{(e.category || "").replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.description || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${e.entry_type === "debit" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>{e.entry_type}</Badge></TableCell>
                  <TableCell className={`text-right font-medium ${e.entry_type === "debit" ? "text-red-400" : "text-green-400"}`}>{e.entry_type === "debit" ? "-" : "+"}{formatCurrency(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading uppercase tracking-wider">New Ledger Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Customer *</Label><Input value={formData.customer_name} onChange={e => setFormData(d => ({ ...d, customer_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={formData.entry_type} onValueChange={v => setFormData(d => ({ ...d, entry_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="debit">Debit</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(d => ({ ...d, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium</SelectItem><SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="claim">Claim</SelectItem><SelectItem value="refund">Refund</SelectItem><SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" value={formData.amount} onChange={e => setFormData(d => ({ ...d, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={formData.entry_date} onChange={e => setFormData(d => ({ ...d, entry_date: e.target.value }))} /></div>
            <div className="space-y-2 col-span-full"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.customer_name || !formData.amount}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
