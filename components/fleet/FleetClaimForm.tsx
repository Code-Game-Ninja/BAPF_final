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

interface FleetClaimFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSuccess?: () => void;
}

export function FleetClaimForm({ open, onOpenChange, customerId, onSuccess }: FleetClaimFormProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [form, setForm] = useState({
    policy_id: "",
    vehicle_id: "",
    claim_amount: "",
    claim_type: "own_damage",
    accident_details: "",
    surveyor_name: "",
    surveyor_phone: "",
    appointment_date: "",
  });
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: policiesData } = useSWR(
    token && open ? `policies-fleet-${customerId}` : null,
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

  const { data: vehiclesData } = useSWR(
    token && open ? `fleet-vehicles-search-${customerId}-${vehicleSearch}` : null,
    async () => {
      const res = await fetch(`/api/fleet/${customerId}/vehicles?search=${vehicleSearch}&status=Active&limit=20`, {
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
      const res = await fetch(`/api/fleet/${customerId}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          claim_amount: Number(form.claim_amount),
          vehicle_id: form.vehicle_id || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register claim");
      }

      toast.success("Fleet claim registered");
      onSuccess?.();
      onOpenChange(false);
      setForm({ policy_id: "", vehicle_id: "", claim_amount: "", claim_type: "own_damage", accident_details: "", surveyor_name: "", surveyor_phone: "", appointment_date: "" });
      setVehicleSearch("");
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
          <DialogTitle className="font-heading uppercase tracking-wider">Register Fleet Claim</DialogTitle>
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
            <Label>Vehicle (optional)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={vehicleSearch}
                onChange={e => setVehicleSearch(e.target.value)}
                placeholder="Search by registration number..."
                className="pl-9"
              />
            </div>
            {vehiclesData && vehiclesData.length > 0 && vehicleSearch && (
              <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                {vehiclesData.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => { setForm(f => ({ ...f, vehicle_id: v.id })); setVehicleSearch(`${v.registration_number} — ${v.make} ${v.model}`); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/30 border-b border-border last:border-0"
                  >
                    <span className="font-mono font-medium">{v.registration_number}</span>
                    <span className="text-muted-foreground ml-2">{v.make} {v.model}</span>
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
                  <SelectItem value="own_damage">Own Damage</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
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

          <div className="space-y-1.5">
            <Label>Accident Details</Label>
            <Textarea
              value={form.accident_details}
              onChange={e => setForm(f => ({ ...f, accident_details: e.target.value }))}
              placeholder="Describe the accident / incident..."
              rows={3}
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Surveyor Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Surveyor Name</Label>
                <Input
                  value={form.surveyor_name}
                  onChange={e => setForm(f => ({ ...f, surveyor_name: e.target.value }))}
                  placeholder="Surveyor name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Surveyor Contact</Label>
                <Input
                  value={form.surveyor_phone}
                  onChange={e => setForm(f => ({ ...f, surveyor_phone: e.target.value }))}
                  placeholder="Contact number"
                />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <Label>Appointment Date</Label>
              <Input
                type="date"
                value={form.appointment_date}
                onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
              />
            </div>
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
