"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarClock,
  MessageSquare,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { renewalService } from "@/lib/services/renewal.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { useAuth } from "@/lib/context/auth-context";
import { invalidateRenewals } from "@/lib/hooks/use-renewals";
import { friendlyError } from "@/lib/helpers/friendly-error";
import {
  renewalUpdateSchema,
  RENEWAL_STATUSES,
  type RenewalUpdateFormData,
} from "@/lib/validations/renewal";
import type { Renewal, RenewalStatus } from "@/lib/types";

// ---- Status Update Dialog ----

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renewal: Renewal | null;
  onSuccess?: () => void;
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  renewal,
  onSuccess,
}: StatusUpdateDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [status, setStatus] = useState<RenewalStatus>(
    renewal?.status || "due"
  );
  const [notes, setNotes] = useState(renewal?.notes || "");

  // Reset when renewal changes or dialog opens
  useEffect(() => {
    if (renewal && open) {
      setStatus(renewal.status);
      setNotes(renewal.notes || "");
    }
  }, [renewal, open]);

  const canUpdate = user?.role === "admin" || user?.role === "manager";

  async function handleSave() {
    if (!renewal || !user || !canUpdate) return;
    setIsSubmitting(true);

    try {
      await renewalService.updateStatus(
        renewal.id,
        status,
        user.uid,
        notes || undefined
      );
      toast.success(`Renewal marked as "${status}"`);
      invalidateRenewals();
      auditLogService.logAction(
        user.uid, user.name || "", "update", "renewals",
        `Updated renewal ${renewal.id} status to ${status}`
      ).catch(() => {});
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Renewal update error:", err);
      toast.error(friendlyError(err, "Failed to update renewal"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!renewal) return null;

  const dueDate = renewal.due_date ? new Date(renewal.due_date) : undefined;
  const isOverdue = dueDate && dueDate < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Update Renewal Status
          </DialogTitle>
          <DialogDescription>
            {renewal.policy_number} — {renewal.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current info */}
          <div className="rounded-lg border border-muted-foreground/20 bg-card p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Due Date:</span>
                <p className="font-medium text-foreground">
                  {dueDate?.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="mt-0.5">
                  <Badge
                    style={{
                      backgroundColor: `${
                        RENEWAL_STATUSES.find((s) => s.value === renewal.status)
                          ?.color || "#5D5D5D"
                      }20`,
                      color:
                        RENEWAL_STATUSES.find((s) => s.value === renewal.status)
                          ?.color || "#5D5D5D",
                    }}
                  >
                    {renewal.status}
                  </Badge>
                  {isOverdue && renewal.status !== "renewed" && renewal.status !== "lost" && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* New status */}
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as RenewalStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RENEWAL_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Called customer, will renew next week..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{notes.length}/500</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {!canUpdate && (
              <p className="text-sm text-muted-foreground self-center mr-auto">
                Only admin/manager can update renewals
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !canUpdate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Quick Action Buttons ----

interface QuickActionsProps {
  renewal: Renewal;
  onStatusChange?: () => void;
}

export function RenewalQuickActions({
  renewal,
  onStatusChange,
}: QuickActionsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const canUpdate = user?.role === "admin" || user?.role === "manager";

  async function quickUpdate(newStatus: RenewalStatus) {
    if (!user) return;
    setLoading(newStatus);
    try {
      await renewalService.updateStatus(renewal.id, newStatus, user.uid);
      toast.success(`Marked as "${newStatus}"`);
      invalidateRenewals();
      auditLogService.logAction(
        user.uid, user.name || "", "update", "renewals",
        `Quick-action: marked renewal ${renewal.id} as ${newStatus}`
      ).catch(() => {});
      onStatusChange?.();
    } catch (err: any) {
      toast.error(friendlyError(err, "Update failed"));
    } finally {
      setLoading(null);
    }
  }

  if (renewal.status === "renewed" || renewal.status === "lost") {
    return null; // No actions for terminal states
  }

  // Only admin/manager can update renewals (matches RLS policies)
  if (!canUpdate) return null;

  return (
    <div className="flex items-center gap-1">
      {renewal.status === "due" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-blue-400 hover:text-blue-300"
          onClick={() => quickUpdate("contacted")}
          disabled={!!loading}
        >
          {loading === "contacted" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Phone className="h-3 w-3" />
          )}
          Contacted
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-green-400 hover:text-green-300"
        onClick={() => quickUpdate("renewed")}
        disabled={!!loading}
      >
        {loading === "renewed" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
        Renewed
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-red-400 hover:text-red-300"
        onClick={() => quickUpdate("lost")}
        disabled={!!loading}
      >
        {loading === "lost" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        Lost
      </Button>
    </div>
  );
}
