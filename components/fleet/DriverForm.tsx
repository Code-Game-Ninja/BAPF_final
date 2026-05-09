"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface DriverFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  editData?: any;
  onSuccess?: () => void;
}

export function DriverForm({ open, onOpenChange, customerId, editData, onSuccess }: DriverFormProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const isEdit = !!editData;

  const [form, setForm] = useState({
    name: "",
    license_number: "",
    license_expiry: "",
    mobile: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || "",
        license_number: editData.license_number || "",
        license_expiry: editData.license_expiry ? editData.license_expiry.split("T")[0] : "",
        mobile: editData.mobile || "",
        address: editData.address || "",
      });
    } else {
      setForm({ name: "", license_number: "", license_expiry: "", mobile: "", address: "" });
    }
  }, [editData, open]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.license_number.trim()) { toast.error("License Number is required"); return; }
    if (!form.license_expiry) { toast.error("License Expiry is required"); return; }

    // Validate future date
    if (new Date(form.license_expiry) <= new Date()) {
      toast.error("License Expiry must be a future date");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/fleet/${customerId}/drivers/${editData.id}`
        : `/api/fleet/${customerId}/drivers`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save driver");
      }

      toast.success(isEdit ? "Driver updated" : "Driver added");
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">
            {isEdit ? "Edit Driver" : "Add Driver"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Driver full name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>License Number <span className="text-destructive">*</span></Label>
              <Input
                value={form.license_number}
                onChange={e => setForm(f => ({ ...f, license_number: e.target.value.toUpperCase() }))}
                placeholder="MH0120XXXXXXXX"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>License Expiry <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.license_expiry}
                onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mobile</Label>
            <Input
              value={form.mobile}
              onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
              placeholder="10-digit mobile"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Driver address"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Update Driver" : "Add Driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
