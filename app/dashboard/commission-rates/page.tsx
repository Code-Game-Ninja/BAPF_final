"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { toast } from "sonner";
import { Percent, Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";

const POLICY_TYPES = [
  "motor", "health", "life", "fire", "marine", "burglary",
  "liability", "workmen_compensation", "travel", "other",
];

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function CommissionRatesPage() {
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";
  const isAdmin = role === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRate, setEditRate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [insurerName, setInsurerName] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [rateType, setRateType] = useState("percentage");
  const [rateValue, setRateValue] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);

  const { data: rates, isLoading, mutate } = useSWR(
    token ? [`/api/commission-rates`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const openCreate = () => {
    setEditRate(null);
    setInsurerName("");
    setPolicyType("");
    setRateType("percentage");
    setRateValue("");
    setEffectiveFrom(new Date().toISOString().split("T")[0]);
    setDialogOpen(true);
  };

  const openEdit = (rate: any) => {
    setEditRate(rate);
    setInsurerName(rate.insurer_name);
    setPolicyType(rate.policy_type);
    setRateType(rate.rate_type);
    setRateValue(String(rate.rate_value));
    setEffectiveFrom(rate.effective_from);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!insurerName || !policyType || !rateValue) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const payload = {
        insurer_name: insurerName,
        policy_type: policyType,
        rate_type: rateType,
        rate_value: parseFloat(rateValue),
        effective_from: effectiveFrom,
      };

      const url = editRate
        ? `/api/commission-rates/${editRate.id}`
        : "/api/commission-rates";
      const method = editRate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      toast.success(editRate ? "Rate updated" : "Rate created");
      setDialogOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary" />
            Commission Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure commission rates by insurer and policy type
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Rate
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (rates ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Percent className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No commission rates configured.</p>
            {isAdmin && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Rate
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Insurer</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Policy Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Rate Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Rate Value</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Effective From</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                {isAdmin && (
                  <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rates ?? []).map((rate: any) => (
                <TableRow key={rate.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{rate.insurer_name}</TableCell>
                  <TableCell className="text-sm capitalize">
                    {rate.policy_type?.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {rate.rate_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {rate.rate_value}{rate.rate_type === "percentage" ? "%" : " flat"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {rate.effective_from}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        rate.is_active
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}
                    >
                      {rate.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(rate)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">
              {editRate ? "Edit Commission Rate" : "Add Commission Rate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Insurer Name *</Label>
              <Input
                placeholder="e.g., HDFC Ergo"
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Policy Type *</Label>
              <Select value={policyType} onValueChange={setPolicyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rate Type *</Label>
                <Select value={rateType} onValueChange={setRateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rate Value *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={rateType === "percentage" ? "0–100" : "Amount"}
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editRate ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
