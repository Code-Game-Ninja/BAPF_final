"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import useSWR from "swr";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface GMCClaimFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSuccess?: () => void;
}

export function GMCClaimForm({ open, onOpenChange, customerId, onSuccess }: GMCClaimFormProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [form, setForm] = useState({
    policy_id: "",
    member_id: "",
    tpa: "",
    claim_amount: "",
    claim_type: "cashless",
    description: "",
    hospital_name: "",
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: policiesData } = useSWR(
    token && open ? `policies-gmc-${customerId}` : null,
    async () => {
      const res = await fetch(`/api/policies?customer_id=${customerId}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const d = await res.json();
      return d.data ?? [];
    },
    { revalidateOnFocus: false }
  );

  const { data: membersData } = useSWR(
    token && open ? `gmc-members-search-${customerId}-${memberSearch}` : null,
    async () => {
      const res = await fetch(`/api/gmc/${customerId}/members?search=${memberSearch}&status=Active&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const d = await res.json();
      return d.data ?? [];
    },
    { revalidateOnFocus: false }
  );

  const handleSave = async () => {
    if (!form.policy_id) { toast.error("Policy is required"); return; }
    if (!form.claim_amount || Number(form.claim_amount) <= 0) { toast.error("Valid claim amount is required"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/gmc/${customerId}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          claim_amount: Number(form.claim_amount),
          member_id: form.member_id || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register claim");
      }

      toast.success("GMC claim registered");
      onSuccess?.();
      onOpenChange(false);
      setForm({ policy_id: "", member_id: "", tpa: "", claim_amount: "", claim_type: "cashless", description: "", hospital_name: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">Register GMC Claim</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Policy <span className="text-destructive">*</span></Label>
            <Select value={form.policy_id} onValueChange={v => setForm(f => ({ ...f, policy_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
              <SelectContent>
                {(policiesData ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.policy_number} · {p.policy_type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Member (optional)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search member by name or employee ID..."
                className="pl-9"
              />
            </div>
            {membersData && membersData.length > 0 && memberSearch && (
              <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                {membersData.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => { setForm(f => ({ ...f, member_id: m.id })); setMemberSearch(`${m.name} (${m.employee_id})`); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/30 border-b border-border last:border-0"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground ml-2">{m.employee_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Claim Type</Label>
              <Select value={form.claim_type} onValueChange={v => setForm(f => ({ ...f, claim_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashless">Cashless</SelectItem>
                  <SelectItem value="reimbursement">Reimbursement</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Claim Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={form.claim_amount}
                onChange={e => setForm(f => ({ ...f, claim_amount: e.target.value }))}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>TPA</Label>
              <Input
                value={form.tpa}
                onChange={e => setForm(f => ({ ...f, tpa: e.target.value }))}
                placeholder="e.g. Medi Assist"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hospital Name</Label>
              <Input
                value={form.hospital_name}
                onChange={e => setForm(f => ({ ...f, hospital_name: e.target.value }))}
                placeholder="Hospital name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Claim description / diagnosis..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Register Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
