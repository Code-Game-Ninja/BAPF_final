"use client";

import { useState } from "react";
import { Plus, Phone, Users, Building2, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { Customer, CorporateMember, IndividualEntityMetadata, CorporateEntityMetadata } from "@/lib/types";
import { customerService } from "@/lib/services/customer.service";
import { useAuth } from "@/lib/context/auth-context";
import { useFamilyMembers } from "@/lib/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContactsTabProps {
  customer: Customer;
}

interface LocalFamilyMember {
  id: string;
  name: string;
  relationship: string;
  dob?: string;
  gender?: string;
  mobile?: string;
  notes?: string;
  created_at: string;
}

export function ContactsTab({ customer }: ContactsTabProps) {
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "manager";
  const isIndividual = customer.type === "individual";
  const corporateTypes = ["corporate", "sme", "government", "contractor", "manufacturer", "transporter", "trader"];
  const isCorporate = corporateTypes.includes(customer.type);

  if (isIndividual) return <IndividualContacts customer={customer} canEdit={canEdit} />;
  if (isCorporate) return <CorporateContacts customer={customer} canEdit={canEdit} />;

  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
      <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>No contacts applicable for this entity type.</p>
    </div>
  );
}

// ─── Individual: Family Members ───────────────────────────────────

function IndividualContacts({ customer, canEdit }: { customer: Customer; canEdit: boolean }) {
  const { mutate } = useFamilyMembers(customer.family_id || null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", relationship: "", dob: "", gender: "", mobile: "", notes: "" });

  const individualMeta = customer.entity_meta as (IndividualEntityMetadata & { family_members?: LocalFamilyMember[] }) | undefined;
  const storedMembers: LocalFamilyMember[] = individualMeta?.family_members || [];

  const handleAdd = async () => {
    if (!form.name || !form.relationship) {
      toast.error("Name and relationship are required");
      return;
    }
    setSaving(true);
    try {
      const existingMeta = (customer.entity_meta as IndividualEntityMetadata) || {};
      const existingMembers = (existingMeta as IndividualEntityMetadata & { family_members?: LocalFamilyMember[] }).family_members || [];
      const newMember: LocalFamilyMember = { ...form, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      
      await customerService.update(customer.id, {
        entity_meta: { ...existingMeta, family_members: [...existingMembers, newMember] } as any,
      });
      toast.success("Family member added");
      void mutate();
      setAddOpen(false);
      setForm({ name: "", relationship: "", dob: "", gender: "", mobile: "", notes: "" });
    } catch (err) {
      console.error("Failed to add family member:", err);
      toast.error("Failed to add family member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Family Members</h3>
          <Badge variant="secondary" className="text-xs">{storedMembers.length}</Badge>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Member
          </Button>
        )}
      </div>

      {storedMembers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No family members added yet.</p>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-2 mt-3">
              <Plus className="w-4 h-4" /> Add Family Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {storedMembers.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{m.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{m.name}</p>
                <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{m.relationship}</span>
                  {m.dob && <span>DOB: {m.dob}</span>}
                  {m.gender && <span className="capitalize">{m.gender}</span>}
                  {m.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.mobile}</span>}
                </div>
                {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Relationship <span className="text-destructive">*</span></Label>
                <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Spouse", "Child", "Parent", "Sibling", "Grandparent", "Grandchild", "Other"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="10-digit mobile" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving} className="gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Corporate: Corporate Members ────────────────────────────────

function CorporateContacts({ customer, canEdit }: { customer: Customer; canEdit: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", designation: "", department: "", email: "", mobile: "", role: "", branch_location: "", notes: "" });

  const corporateMeta = customer.entity_meta as CorporateEntityMetadata | undefined;
  const storedMembers: CorporateMember[] = corporateMeta?.members || [];

  const handleAdd = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const existingMeta = (customer.entity_meta as CorporateEntityMetadata) || {};
      const existingMembers = existingMeta.members || [];
      const newMember: CorporateMember & { id: string } = { ...form, id: crypto.randomUUID() };
      await customerService.update(customer.id, {
        entity_meta: { ...existingMeta, members: [...existingMembers, newMember] },
      });
      toast.success("Corporate member added");
      setAddOpen(false);
      setForm({ name: "", designation: "", department: "", email: "", mobile: "", role: "", branch_location: "", notes: "" });
    } catch (err) {
      console.error("Failed to add corporate member:", err);
      toast.error("Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Corporate Members & Contacts</h3>
          <Badge variant="secondary" className="text-xs">{storedMembers.length}</Badge>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Contact
          </Button>
        )}
      </div>

      {storedMembers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No corporate contacts added yet.</p>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-2 mt-3">
              <Plus className="w-4 h-4" /> Add Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {storedMembers.map((m, idx) => (
            <div key={(m as CorporateMember & { id?: string }).id || idx} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-400">{m.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{m.name}</p>
                  {m.role && <Badge variant="outline" className="text-xs">{m.role}</Badge>}
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  {m.designation && <span>{m.designation}</span>}
                  {m.department && <span>· {m.department}</span>}
                  {m.branch_location && <span>· {m.branch_location}</span>}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {m.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.mobile}</span>}
                  {m.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>}
                </div>
                {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">Add Corporate Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {["Primary POC", "Secondary POC", "HR Contact", "Finance Contact", "IT Contact", "Other"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. HR Manager" />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Human Resources" />
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
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>Branch / Location</Label>
                <Input value={form.branch_location} onChange={e => setForm(f => ({ ...f, branch_location: e.target.value }))} placeholder="e.g. Mumbai HQ" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving} className="gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
