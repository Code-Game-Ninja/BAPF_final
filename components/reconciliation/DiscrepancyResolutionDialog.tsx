"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Shield, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/context/auth-context";

interface DiscrepancyRecord {
  id: string;
  policy_number?: string;
  discrepancy_type?: string;
  statement_commission?: number;
  crm_commission?: number;
  discrepancy_amount?: number;
  resolution_status: string;
}

interface DiscrepancyResolutionDialogProps {
  runId: string;
  record: DiscrepancyRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

const RESOLUTION_OPTIONS = [
  {
    value: "accept_statement",
    label: "Accept Statement",
    description: "Update CRM commission to match the insurer statement amount",
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  {
    value: "accept_crm",
    label: "Accept CRM",
    description: "Keep the CRM commission amount as correct, mark resolved",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    value: "escalate",
    label: "Escalate",
    description: "Create a service ticket and notify the manager for review",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
];

export function DiscrepancyResolutionDialog({
  runId,
  record,
  open,
  onOpenChange,
  onResolved,
}: DiscrepancyResolutionDialogProps) {
  const { session } = useAuth();
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResolve = async () => {
    if (!selectedResolution || !record) return;

    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `/api/reconciliation/${runId}/records/${record.id}/resolve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resolution: selectedResolution, notes }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resolve");

      toast.success("Discrepancy resolved");
      setSelectedResolution(null);
      setNotes("");
      onOpenChange(false);
      onResolved?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to resolve");
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">
            Resolve Discrepancy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Discrepancy Info */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Policy #</span>
              <span className="font-mono">{record.policy_number ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="outline" className="text-xs capitalize">
                {record.discrepancy_type?.replace(/_/g, " ") ?? "—"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CRM Amount</span>
              <span>₹{(record.crm_commission ?? 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statement Amount</span>
              <span>₹{(record.statement_commission ?? 0).toLocaleString("en-IN")}</span>
            </div>
            {record.discrepancy_amount && (
              <div className="flex justify-between text-red-400">
                <span>Difference</span>
                <span>₹{record.discrepancy_amount.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          {/* Resolution Options */}
          <div className="space-y-2">
            <Label>Select Resolution *</Label>
            {RESOLUTION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedResolution(opt.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                    selectedResolution === opt.value
                      ? opt.bg
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${opt.color}`} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="resolution-notes">Notes (optional)</Label>
            <Textarea
              id="resolution-notes"
              placeholder="Add resolution notes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!selectedResolution || loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Resolve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
