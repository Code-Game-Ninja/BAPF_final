"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Search, X, User, Loader2,
  MoreHorizontal, Pencil, Trash2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { DriverForm } from "@/components/fleet/DriverForm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getExpiryColor(daysLeft: number): string {
  if (daysLeft < 0) return "bg-red-500/10 text-red-400";
  if (daysLeft <= 30) return "bg-orange-500/10 text-orange-400";
  return "bg-green-500/10 text-green-400";
}

function getExpiryLabel(daysLeft: number): string {
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
  if (daysLeft === 0) return "Expires today";
  return `${daysLeft}d remaining`;
}

async function fetchDrivers(customerId: string, token: string) {
  const res = await fetch(`/api/fleet/${customerId}/drivers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json();
}

export default function FleetDriversPage() {
  const params = useParams();
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";
  const customerId = params.customerId as string;

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    token ? `fleet-drivers-${customerId}` : null,
    () => fetchDrivers(customerId, token),
    { revalidateOnFocus: false }
  );

  const drivers = (data?.data ?? []).filter((d: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.name?.toLowerCase().includes(q) || d.license_number?.toLowerCase().includes(q);
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fleet/${customerId}/drivers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete driver");
      }
      toast.success("Driver deleted");
      setDeleteTarget(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const canEdit = role === "admin" || role === "manager";

  return (
    <motion.div {...pageTransition} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/fleet/${customerId}/vehicles`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Fleet Drivers
            </h1>
            <p className="text-sm text-muted-foreground">{drivers.length} drivers</p>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Driver
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or license number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <User className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No drivers found.</p>
            {canEdit && (
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Driver
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">License Number</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">License Expiry</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Mobile</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                {canEdit && <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d: any) => {
                const daysLeft = d.license_expiry
                  ? differenceInDays(new Date(d.license_expiry), new Date())
                  : 999;
                return (
                  <TableRow key={d.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{d.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{d.license_number}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {d.license_expiry ? format(new Date(d.license_expiry), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {d.mobile || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getExpiryColor(daysLeft)}`}>
                        {daysLeft < 0 && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {getExpiryLabel(daysLeft)}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditDriver(d)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(d)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Driver Dialog */}
      <DriverForm
        open={addOpen}
        onOpenChange={setAddOpen}
        customerId={customerId}
        onSuccess={() => mutate()}
      />

      {/* Edit Driver Dialog */}
      <DriverForm
        open={!!editDriver}
        onOpenChange={open => !open && setEditDriver(null)}
        customerId={customerId}
        editData={editDriver}
        onSuccess={() => { mutate(); setEditDriver(null); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">Delete Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Delete driver <strong>{deleteTarget?.name}</strong> ({deleteTarget?.license_number})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete Driver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
