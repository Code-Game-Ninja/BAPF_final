"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Wallet,
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
import { Label } from "@/components/ui/label";

import { commissionService } from "@/lib/services/commission.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { useAuth } from "@/lib/context/auth-context";
import { invalidateCommissions } from "@/lib/hooks/use-commissions";
import { COMMISSION_STATUSES } from "@/lib/validations/commission";
import type { Commission, CommissionStatus } from "@/lib/types";

// ---- Status Badge ----

export function CommissionStatusBadge({
  status,
}: {
  status: CommissionStatus;
}) {
  const config = COMMISSION_STATUSES.find((s) => s.value === status);
  const icon =
    status === "paid" ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : status === "approved" ? (
      <Wallet className="h-3 w-3" />
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

interface StatusDialogProps {
  commission: Commission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommissionStatusDialog({
  commission,
  open,
  onOpenChange,
}: StatusDialogProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CommissionStatus>(commission?.status || "pending");
  const [saving, setSaving] = useState(false);

  // Sync status when commission changes or dialog opens
  useEffect(() => {
    if (commission && open) {
      setStatus(commission.status);
    }
  }, [commission, open]);

  const canUpdate = user?.role === "admin" || user?.role === "manager";
  const isTerminal = commission?.status === "paid";

  // Only show statuses that are valid forward moves from the current status
  const statusOrder: CommissionStatus[] = ["pending", "approved", "paid"];
  const currentIndex = statusOrder.indexOf(commission?.status ?? "pending");
  const availableStatuses = COMMISSION_STATUSES.filter(
    (s) => statusOrder.indexOf(s.value as CommissionStatus) >= currentIndex
  );

  const handleSave = async () => {
    if (!commission || !canUpdate) return;
    if (status === commission.status) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      if (status === "approved") {
        await commissionService.approve(commission.id);
      } else if (status === "paid") {
        await commissionService.markPaid(commission.id);
      } else {
        toast.error("Cannot set status back to pending");
        setSaving(false);
        return;
      }
      toast.success(`Commission marked as ${status}`);
      invalidateCommissions();
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "update", "commissions",
          `Updated commission ${commission.id} status to ${status}`
        ).catch(() => {});
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to update commission");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-secondary">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Update Commission Status
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {commission
              ? `Policy: ${commission.policy_number} · Amount: ₹${commission.amount?.toLocaleString("en-IN")}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-foreground">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CommissionStatus)}
            >
              <SelectTrigger className="bg-background border-secondary text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-secondary">
                {availableStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span style={{ color: s.color }}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={saving || !canUpdate || isTerminal}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              title={isTerminal ? "Commission is already paid and cannot be changed" : undefined}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isTerminal ? "Paid (locked)" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Quick Actions ----

interface QuickActionsProps {
  commission: Commission;
  onStatusChange?: () => void;
}

export function CommissionQuickActions({
  commission,
  onStatusChange,
}: QuickActionsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const canUpdate = user?.role === "admin" || user?.role === "manager";

  if (commission.status === "paid" || !canUpdate) return null;

  const handleAction = async (action: "approved" | "paid") => {
    setLoading(action);
    try {
      if (action === "approved") {
        await commissionService.approve(commission.id);
      } else {
        await commissionService.markPaid(commission.id);
      }
      toast.success(
        `Commission marked as ${action === "approved" ? "Approved" : "Paid"}`
      );
      invalidateCommissions();
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "update", "commissions",
          `Quick-action: marked commission ${commission.id} as ${action}`
        ).catch(() => {});
      }
      onStatusChange?.();
    } catch {
      toast.error("Failed to update commission");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1">
      {commission.status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          onClick={() => handleAction("approved")}
          disabled={loading !== null}
        >
          {loading === "approved" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          )}
          Approve
        </Button>
      )}

      {(commission.status === "pending" ||
        commission.status === "approved") && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
          onClick={() => handleAction("paid")}
          disabled={loading !== null}
        >
          {loading === "paid" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wallet className="h-3 w-3 mr-1" />
          )}
          Mark Paid
        </Button>
      )}
    </div>
  );
}
