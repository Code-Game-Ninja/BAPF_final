"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const DOC_TYPES = [
  { key: "permit_state", label: "Permit (State)" },
  { key: "permit_national", label: "Permit (National)" },
  { key: "fitness", label: "Fitness" },
  { key: "puc", label: "PUC" },
  { key: "rc", label: "RC" },
  { key: "tax_state", label: "Tax (State)" },
  { key: "tax_national", label: "Tax (National)" },
] as const;

type DocType = typeof DOC_TYPES[number]["key"];

interface ValidityEntry {
  issue_date: string;
  expiry_date: string;
}

interface ValidityUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  vehicleId: string;
  vehicleRegNumber: string;
  onSuccess?: () => void;
}

export function ValidityUpdateDialog({
  open,
  onOpenChange,
  customerId,
  vehicleId,
  vehicleRegNumber,
  onSuccess,
}: ValidityUpdateDialogProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [entries, setEntries] = useState<Record<DocType, ValidityEntry>>(
    () => Object.fromEntries(DOC_TYPES.map(d => [d.key, { issue_date: "", expiry_date: "" }])) as Record<DocType, ValidityEntry>
  );
  const [saving, setSaving] = useState<DocType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateEntry = (docType: DocType, field: "issue_date" | "expiry_date", value: string) => {
    setEntries(prev => ({ ...prev, [docType]: { ...prev[docType], [field]: value } }));
    // Clear error on change
    setErrors(prev => { const next = { ...prev }; delete next[docType]; return next; });
  };

  const validateEntry = (docType: DocType): string | null => {
    const entry = entries[docType];
    if (!entry.expiry_date) return null; // Skip if no expiry date
    if (entry.issue_date && new Date(entry.expiry_date) <= new Date(entry.issue_date)) {
      return "Expiry date must be after issue date";
    }
    return null;
  };

  const handleSaveOne = async (docType: DocType) => {
    const entry = entries[docType];
    if (!entry.expiry_date) {
      toast.error("Expiry date is required");
      return;
    }

    const validationError = validateEntry(docType);
    if (validationError) {
      setErrors(prev => ({ ...prev, [docType]: validationError }));
      toast.error(validationError);
      return;
    }

    setSaving(docType);
    try {
      const res = await fetch(`/api/fleet/${customerId}/vehicles/${vehicleId}/validity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          document_type: docType,
          issue_date: entry.issue_date || null,
          expiry_date: entry.expiry_date,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update validity");
      }

      toast.success(`${DOC_TYPES.find(d => d.key === docType)?.label} updated`);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    const toSave = DOC_TYPES.filter(d => entries[d.key].expiry_date);
    if (toSave.length === 0) {
      toast.error("Please enter at least one expiry date");
      return;
    }

    // Validate all
    const newErrors: Record<string, string> = {};
    for (const d of toSave) {
      const err = validateEntry(d.key);
      if (err) newErrors[d.key] = err;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix validation errors");
      return;
    }

    setSaving("permit_state"); // Use any value to show loading
    try {
      await Promise.all(
        toSave.map(d =>
          fetch(`/api/fleet/${customerId}/vehicles/${vehicleId}/validity`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              document_type: d.key,
              issue_date: entries[d.key].issue_date || null,
              expiry_date: entries[d.key].expiry_date,
            }),
          })
        )
      );
      toast.success(`${toSave.length} validity documents updated`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update some documents");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Update Validity Dates
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-mono">{vehicleRegNumber}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {DOC_TYPES.map(({ key, label }) => (
            <div key={key} className="bg-muted/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{label}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveOne(key)}
                  disabled={saving !== null || !entries[key].expiry_date}
                  className="h-7 text-xs"
                >
                  {saving === key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Issue Date</Label>
                  <Input
                    type="date"
                    value={entries[key].issue_date}
                    onChange={e => updateEntry(key, "issue_date", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                  <Input
                    type="date"
                    value={entries[key].expiry_date}
                    onChange={e => updateEntry(key, "expiry_date", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {errors[key] && (
                <p className="text-xs text-red-400">{errors[key]}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving !== null}>Cancel</Button>
          <Button onClick={handleSaveAll} disabled={saving !== null} className="gap-2">
            {saving !== null && <Loader2 className="w-4 h-4 animate-spin" />}
            Save All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
