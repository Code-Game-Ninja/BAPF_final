"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Search, X, Upload, CreditCard,
  Users, Loader2, MoreHorizontal, Trash2,
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

interface GMCMember {
  id: string;
  employee_id: string;
  name: string;
  member_type: string;
  department?: string;
  designation?: string;
  mobile?: string;
  status: string;
  policy_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-500/10 text-green-400",
  Inactive: "bg-amber-500/10 text-amber-400",
  Deleted: "bg-red-500/10 text-red-400",
};

async function fetchMembers(customerId: string, token: string, params: string) {
  const res = await fetch(`/api/gmc/${customerId}/members?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

async function fetchPolicies(customerId: string, token: string): Promise<Policy[]> {
  // Get policies for this customer
  const pRes = await fetch(`/api/policies?customer_id=${customerId}&limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pRes.ok) return [];
  const data = await pRes.json();
  return (data.data ?? []) as Policy[];
}

export default function GMCMembersPage() {
  const params = useParams();
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";
  const customerId = params.customerId as string;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GMCMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const queryParams = new URLSearchParams({
    search, status: statusFilter, page: String(page), limit: "50",
  }).toString();

  const { data: membersData, isLoading, mutate } = useSWR(
    token ? `gmc-members-${customerId}-${queryParams}` : null,
    () => fetchMembers(customerId, token, queryParams),
    { revalidateOnFocus: false }
  );

  const { data: policies } = useSWR(
    token ? `policies-${customerId}` : null,
    () => fetchPolicies(customerId, token),
    { revalidateOnFocus: false }
  );

  const members = (membersData?.data ?? []) as GMCMember[];
  const total = membersData?.total ?? 0;

  // Add member form state
  const [form, setForm] = useState({
    employee_id: "", name: "", policy_id: "", member_type: "employee",
    dob: "", gender: "", mobile: "", email: "", department: "", designation: "",
  });

  const handleAdd = async () => {
    if (!form.employee_id || !form.name || !form.policy_id) {
      toast.error("Employee ID, Name, and Policy are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/gmc/${customerId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add member");
      }
      toast.success("Member added successfully");
      setAddOpen(false);
      setForm({ employee_id: "", name: "", policy_id: "", member_type: "employee", dob: "", gender: "", mobile: "", email: "", department: "", designation: "" });
      void mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/gmc/${customerId}/members/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete member");
      }
      toast.success("Member deleted and endorsement created");
      setDeleteTarget(null);
      void mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete member");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateECard = async (memberId: string) => {
    try {
      const res = await fetch(`/api/gmc/${customerId}/members/${memberId}/ecard`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to generate e-card");
      const data = await res.json();
      window.open(data.file_url, "_blank");
      toast.success("E-Card generated successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate e-card");
    }
  };

  const canEdit = role === "admin" || role === "manager";

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/gmc")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              GMC Members
            </h1>
            <p className="text-sm text-muted-foreground">{total} members</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/gmc/${customerId}/members/bulk`)} className="gap-2">
              <Upload className="w-4 h-4" /> Bulk Upload
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Member
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, employee ID, mobile..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No members found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider font-heading">Employee ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden md:table-cell">Department</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading hidden sm:table-cell">Mobile</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">{m.employee_id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      {m.designation && <p className="text-xs text-muted-foreground">{m.designation}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs capitalize">{m.member_type}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{m.department || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{m.mobile || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[m.status] || ""}`}>{m.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void handleGenerateECard(m.id)}>
                          <CreditCard className="w-4 h-4 mr-2" /> Generate E-Card
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(m)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Member
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

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">Add GMC Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Employee ID <span className="text-destructive">*</span></Label>
                <Input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} placeholder="EMP001" />
              </div>
              <div className="space-y-1.5">
                <Label>Member Type</Label>
                <Select value={form.member_type} onValueChange={v => setForm(f => ({ ...f, member_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="dependent">Dependent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Policy <span className="text-destructive">*</span></Label>
              <Select value={form.policy_id} onValueChange={v => setForm(f => ({ ...f, policy_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                <SelectContent>
                  {(policies ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.policy_number} · {p.policy_type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="10-digit mobile" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. HR" />
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Manager" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAdd()} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.employee_id})?
              This will create a deletion endorsement record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
