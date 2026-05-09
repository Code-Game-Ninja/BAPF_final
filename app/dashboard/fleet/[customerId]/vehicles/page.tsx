"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Search, X, Upload, Car,
  Loader2, MoreHorizontal, Trash2, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { Policy } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FleetVehicle {
  id: string;
  registration_number: string;
  make: string;
  model: string;
  variant?: string;
  fuel_type?: string;
  mfg_year?: number;
  vehicle_category?: string;
  idv?: number;
  status: string;
  fleet_drivers?: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-500/10 text-green-400",
  Inactive: "bg-amber-500/10 text-amber-400",
  Deleted: "bg-red-500/10 text-red-400",
};

async function fetchVehicles(customerId: string, token: string, params: string) {
  const res = await fetch(`/api/fleet/${customerId}/vehicles?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch vehicles");
  return res.json();
}

export default function FleetVehiclesPage() {
  const params = useParams();
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";
  const customerId = params.customerId as string;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FleetVehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const queryParams = new URLSearchParams({
    search, status: statusFilter, category: categoryFilter, page: String(page), limit: "50",
  }).toString();

  const { data: vehiclesData, isLoading, mutate } = useSWR(
    token ? `fleet-vehicles-${customerId}-${queryParams}` : null,
    () => fetchVehicles(customerId, token, queryParams),
    { revalidateOnFocus: false }
  );

  const vehicles = (vehiclesData?.data ?? []) as FleetVehicle[];
  const total = vehiclesData?.total ?? 0;

  const [form, setForm] = useState({
    registration_number: "", make: "", model: "", variant: "",
    fuel_type: "", mfg_year: "", vehicle_category: "", idv: "",
    seating_capacity: "", gvw: "", policy_id: "",
  });

  const { data: policiesData } = useSWR(
    token ? `policies-fleet-${customerId}` : null,
    async () => {
      // Actually fetch policies
      const pRes = await fetch(`/api/policies?customer_id=${customerId}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pRes.ok) return [];
      const d = await pRes.json();
      return (d.data ?? []) as Policy[];
    },
    { revalidateOnFocus: false }
  );

  const handleAdd = async () => {
    if (!form.registration_number || !form.make || !form.model || !form.policy_id) {
      toast.error("Registration Number, Make, Model, and Policy are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/fleet/${customerId}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          mfg_year: form.mfg_year ? Number(form.mfg_year) : null,
          idv: form.idv ? Number(form.idv) : null,
          seating_capacity: form.seating_capacity ? Number(form.seating_capacity) : null,
          gvw: form.gvw ? Number(form.gvw) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add vehicle");
      }
      toast.success("Vehicle added successfully");
      setAddOpen(false);
      setForm({ registration_number: "", make: "", model: "", variant: "", fuel_type: "", mfg_year: "", vehicle_category: "", idv: "", seating_capacity: "", gvw: "", policy_id: "" });
      void mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fleet/${customerId}/vehicles/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete vehicle");
      }
      toast.success("Vehicle deleted and endorsement created");
      setDeleteTarget(null);
      void mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete vehicle");
    } finally {
      setDeleting(false);
    }
  };

  const canEdit = role === "admin" || role === "manager";

  return (
    <motion.div {...pageTransition} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/fleet")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Fleet Vehicles
            </h1>
            <p className="text-sm text-muted-foreground">{total} vehicles</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/fleet/${customerId}/validity`)} className="gap-2">
              <ShieldCheck className="w-4 h-4" /> Validity Dashboard
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Vehicle
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by registration, make, model..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            <SelectItem value="Two-wheeler">Two-wheeler</SelectItem>
            <SelectItem value="Four-wheeler">Four-wheeler</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Car className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No vehicles found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Reg. Number</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Make / Model</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Category</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">IDV</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Driver</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{v.registration_number}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{v.make} {v.model}</p>
                    {v.variant && <p className="text-xs text-muted-foreground">{v.variant} · {v.mfg_year}</p>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{v.vehicle_category || "—"}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {v.idv ? `₹${Number(v.idv).toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {v.fleet_drivers?.name || "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[v.status] || ""}`}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/fleet/${customerId}/validity`)}>
                          <ShieldCheck className="w-4 h-4 mr-2" /> View Validity
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(v)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Vehicle
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

      {/* Add Vehicle Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">Add Fleet Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Registration Number <span className="text-destructive">*</span></Label>
              <Input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value.toUpperCase() }))} placeholder="MH01AB1234" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Make <span className="text-destructive">*</span></Label>
                <Input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="e.g. Tata" />
              </div>
              <div className="space-y-1.5">
                <Label>Model <span className="text-destructive">*</span></Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. Nexon" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Variant</Label>
                <Input value={form.variant} onChange={e => setForm(f => ({ ...f, variant: e.target.value }))} placeholder="e.g. XZ+" />
              </div>
              <div className="space-y-1.5">
                <Label>Fuel Type</Label>
                <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map(ft => (
                      <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>MFG Year</Label>
                <Input type="number" value={form.mfg_year} onChange={e => setForm(f => ({ ...f, mfg_year: e.target.value }))} placeholder="2020" />
              </div>
              <div className="space-y-1.5">
                <Label>IDV (₹)</Label>
                <Input type="number" value={form.idv} onChange={e => setForm(f => ({ ...f, idv: e.target.value }))} placeholder="500000" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.vehicle_category} onValueChange={v => setForm(f => ({ ...f, vehicle_category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Two-wheeler">Two-wheeler</SelectItem>
                    <SelectItem value="Four-wheeler">Four-wheeler</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Policy <span className="text-destructive">*</span></Label>
              <Select value={form.policy_id} onValueChange={v => setForm(f => ({ ...f, policy_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                <SelectContent>
                  {(policiesData ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.policy_number} · {p.policy_type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAdd()} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Delete vehicle <strong>{deleteTarget?.registration_number}</strong>?
              This will create a deletion endorsement record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
