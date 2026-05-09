"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { premiumService } from "@/lib/services/premium.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { invalidatePremiums } from "@/lib/hooks/use-premiums";
import { useAuth } from "@/lib/context/auth-context";
import { friendlyError } from "@/lib/helpers/friendly-error";
import { PREMIUM_STATUSES } from "@/lib/validations/premium";
import type { Premium, PremiumStatus } from "@/lib/types";

// ---- Status Badge ----

export function PremiumStatusBadge({ status }: { status: PremiumStatus }) {
  const config = PREMIUM_STATUSES.find((s) => s.value === status);
  const icon =
    status === "collected" ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : status === "overdue" ? (
      <AlertCircle className="h-3 w-3" />
    ) : (
      <Clock className="h-3 w-3" />
    );

  return (
    <Badge
      variant="outline"
      className="gap-1 text-xs font-medium"
      style={{
        borderColor: config?.color,
        color: config?.color,
        backgroundColor: `${config?.color}15`,
      }}
    >
      {icon}
      {config?.label || status}
    </Badge>
  );
}

// ---- Status Update Dialog ----

interface StatusUpdateDialogProps {
  premium: Premium | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumStatusDialog({
  premium,
  open,
  onOpenChange,
}: StatusUpdateDialogProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PremiumStatus>(premium?.status || "pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync status when premium changes or dialog opens
  useEffect(() => {
    if (premium && open) {
      setStatus(premium.status);
      setNotes(premium.notes || "");
    }
  }, [premium, open]);

  const canUpdate = user?.role === "admin" || user?.role === "manager";

  const handleSave = async () => {
    if (!premium || !canUpdate) return;

    setSaving(true);
    try {
      await premiumService.updateStatus(
        premium.id,
        status,
        notes || undefined,
        status === "collected" ? user?.uid : undefined,
      );
      toast.success(`Premium marked as ${status}`);
      invalidatePremiums();
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "update", "premiums",
          `Updated premium ${premium.id} status to ${status}`
        ).catch(() => {});
      }
      onOpenChange(false);
      setNotes("");
    } catch (err) {
      console.error("Premium status update failed:", err);
      toast.error(friendlyError(err, "Failed to update premium"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-secondary">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Update Premium Status
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {premium
              ? `Period: ${premium.period} · Amount: ₹${premium.amount?.toLocaleString("en-IN")}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-foreground">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PremiumStatus)}
            >
              <SelectTrigger className="bg-background border-secondary text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-secondary">
                {PREMIUM_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span style={{ color: s.color }}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add collection notes..."
              className="bg-background border-secondary text-foreground min-h-[80px]"
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-secondary text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !canUpdate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Quick Actions ----

interface QuickActionsProps {
  premium: Premium;
  onStatusChange?: () => void;
}

export function PremiumQuickActions({
  premium,
  onStatusChange,
}: QuickActionsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const canUpdate = user?.role === "admin" || user?.role === "manager";

  if (premium.status === "collected" || !canUpdate) return null;

  const handleAction = async (action: "collected" | "overdue") => {
    setLoading(action);
    try {
      if (action === "collected") {
        await premiumService.markCollected(premium.id, user?.uid);
      } else {
        await premiumService.markOverdue(premium.id);
      }
      toast.success(
        `Premium marked as ${action === "collected" ? "Collected" : "Overdue"}`
      );
      invalidatePremiums();
      onStatusChange?.();
    } catch (err) {
      console.error("Premium quick action failed:", err);
      toast.error(friendlyError(err, "Failed to update premium"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
        onClick={() => handleAction("collected")}
        disabled={loading !== null}
      >
        {loading === "collected" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3 w-3 mr-1" />
        )}
        Collected
      </Button>

      {premium.status !== "overdue" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={() => handleAction("overdue")}
          disabled={loading !== null}
        >
          {loading === "overdue" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <AlertCircle className="h-3 w-3 mr-1" />
          )}
          Overdue
        </Button>
      )}
    </div>
  );
}
