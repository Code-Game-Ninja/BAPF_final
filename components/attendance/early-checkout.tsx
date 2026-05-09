"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import { earlyCheckoutService, attendanceService } from "@/lib/services/attendance.service";
import { notificationService } from "@/lib/services/notification.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { userService } from "@/lib/services/user.service";




import {
  invalidateAttendance,
  invalidateEarlyCheckouts,
} from "@/lib/hooks/use-attendance";
import { invalidateNotifications } from "@/lib/hooks/use-settings";
import { friendlyError } from "@/lib/helpers/friendly-error";
import type { EarlyCheckoutRequest } from "@/lib/types";

// ---- Status Badge ----

export function EarlyCheckoutStatusBadge({
  status,
}: {
  status: EarlyCheckoutRequest["status"];
}) {
  const config = {
    pending: { label: "Pending", color: "#f59e0b", icon: Clock },
    approved: { label: "Approved", color: "#4ade80", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "#f87171", icon: XCircle },
  }[status];

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className="gap-1 text-xs"
      style={{
        borderColor: config.color,
        color: config.color,
        backgroundColor: `${config.color}15`,
      }}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ---- Employee: Request Early Checkout Dialog ----

interface EarlyCheckoutDialogProps {
  userId: string;
  userName: string;
  attendanceId: string;
  date: string;
  /** Whether there's already a pending request */
  hasPendingRequest?: boolean;
}

export function EarlyCheckoutDialog({
  userId,
  userName,
  attendanceId,
  date,
  hasPendingRequest,
}: EarlyCheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for early checkout");
      return;
    }

    setLoading(true);
    try {
      await earlyCheckoutService.submitRequest({
        user_id: userId,
        user_name: userName,
        attendance_id: attendanceId,
        date,
        reason: reason.trim(),
      });

      // Notify admins/managers
      try {
        const admins = await userService.getByRole("admin");
        const managers = await userService.getByRole("manager");
        const adminIds = [...admins, ...managers]
          .filter((u) => u.id !== userId)
          .map((u) => u.id);

        if (adminIds.length > 0) {
          await notificationService.broadcast(adminIds, {
            title: "Early Checkout Request",
            message: `${userName} has requested early checkout for ${date}.`,
            type: "attendance",
            link: "/dashboard/attendance",
          });
        }
      } catch {
        // Notification failure is non-critical
      }

      toast.success("Early checkout request submitted");
      invalidateEarlyCheckouts();
      setOpen(false);
      setReason("");
    } catch (err) {
      toast.error(friendlyError(err, "Failed to submit request"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={hasPendingRequest}
          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          title={hasPendingRequest ? "Request already pending" : "Request early checkout"}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {hasPendingRequest ? "Request Pending" : "Early Checkout"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border-strong">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Request Early Checkout
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Submit a request to your admin/manager for early checkout.
            You will be checked out once approved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">
              Reason for early checkout <span className="text-red-400">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Medical appointment, family emergency, feeling unwell..."
              className="bg-background border-border-strong text-foreground min-h-25"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Admin: Pending Requests Panel ----

interface EarlyCheckoutRequestsPanelProps {
  requests: EarlyCheckoutRequest[];
  adminId: string;
  adminName: string;
}

export function EarlyCheckoutRequestsPanel({
  requests,
  adminId,
  adminName,
}: EarlyCheckoutRequestsPanelProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const handleApprove = async (request: EarlyCheckoutRequest) => {
    setProcessing(request.id);
    try {
      // 1. Approve the request
      await earlyCheckoutService.approve(request.id, adminId);

      // 2. Auto-checkout the requestor
      try {
        await attendanceService.checkOut(request.user_id);
      } catch {
        // If checkout fails (e.g. already checked out), continue
      }

      // 3. Notify the requestor so their dashboard auto-logs out
      try {
        await notificationService.broadcast([request.user_id], {
          title: "Early Checkout Approved",
          message: `Your early checkout request for ${request.date} has been approved. You are now checked out and will be logged out shortly.`,
          type: "attendance",
          link: "/dashboard/attendance",
        });
      } catch {
        // Non-critical
      }

      // 4. Send email notification for early checkout approval
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          fetch("/api/attendance/send-notification", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: "early_checkout",
              user_id: request.user_id,
              checkout_time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
              reason: request.reason || "No reason provided",
            }),
          }).catch(() => {}); // fire-and-forget
        }
      } catch {
        // Non-critical — email send failure shouldn't block approval
      }

      toast.success(`Early checkout approved for ${request.user_name}`);
      invalidateEarlyCheckouts();
      invalidateAttendance();
      invalidateNotifications();

      auditLogService
        .logAction(
          adminId,
          adminName,
          "update",
          "attendance",
          `Approved early checkout for ${request.user_name} on ${request.date}`
        )
        .catch(() => {});
    } catch (err) {
      toast.error(friendlyError(err, "Failed to approve"));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: EarlyCheckoutRequest) => {
    setProcessing(request.id);
    try {
      await earlyCheckoutService.reject(request.id, adminId, rejectNote || undefined);
      toast.success(`Early checkout rejected for ${request.user_name}`);
      invalidateEarlyCheckouts();
      invalidateNotifications();
      setRejectingId(null);
      setRejectNote("");

      auditLogService
        .logAction(
          adminId,
          adminName,
          "update",
          "attendance",
          `Rejected early checkout for ${request.user_name} on ${request.date}`
        )
        .catch(() => {});
    } catch (err) {
      toast.error(friendlyError(err, "Failed to reject"));
    } finally {
      setProcessing(null);
    }
  };

  if (!pendingRequests.length) return null;

  return (
    <Card className="bg-card border-orange-500/30">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium text-foreground">
            Pending Early Checkout Requests
          </span>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            {pendingRequests.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-background rounded-lg p-3 border border-border-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {req.user_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {req.date}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.reason}
                  </p>
                  {req.createdAt && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Requested:{" "}
                      {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {rejectingId === req.id ? (
                    <div className="flex items-center gap-2">
                      <Textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Rejection reason (optional)"
                        className="bg-background border-border-strong text-foreground text-xs min-h-15 w-48"
                        maxLength={300}
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => handleReject(req)}
                          disabled={processing === req.id}
                        >
                          {processing === req.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Reject"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectNote("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={() => handleApprove(req)}
                        disabled={processing !== null}
                      >
                        {processing === req.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => setRejectingId(req.id)}
                        disabled={processing !== null}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
