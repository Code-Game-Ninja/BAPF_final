"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Attendance, AttendanceStatus } from "@/lib/types";
import { attendanceService } from "@/lib/services/attendance.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { invalidateAttendance } from "@/lib/hooks/use-attendance";
import { friendlyError } from "@/lib/helpers/friendly-error";
import {
  ATTENDANCE_STATUSES,
  attendanceOverrideSchema,
  type AttendanceOverrideFormData,
} from "@/lib/validations/attendance";
import { LogIn, LogOut, Shield, Loader2, Clock } from "lucide-react";

// ---- Status Badge ----

export function AttendanceStatusBadge({
  status,
}: {
  status: AttendanceStatus;
}) {
  const config = ATTENDANCE_STATUSES.find((s) => s.value === status);

  return (
    <Badge
      variant="outline"
      style={{
        borderColor: config?.color || "#888",
        color: config?.color || "#888",
        backgroundColor: `${config?.color || "#888"}15`,
      }}
    >
      {config?.label || status}
    </Badge>
  );
}

// ---- Check-in / Check-out Button ----

interface CheckInOutProps {
  userId: string;
  userName: string;
  todayRecord: Attendance | null | undefined;
  officeEndTime?: string; // "HH:mm" e.g. "18:00"
  onSuccess?: () => void;
}

export function CheckInOutButton({
  userId,
  userName,
  todayRecord,
  officeEndTime,
  onSuccess,
}: CheckInOutProps) {
  const [loading, setLoading] = useState(false);
  const notifiedRef = useRef(false);

  const isCheckedIn = !!todayRecord?.check_in;
  const isCheckedOut = !!todayRecord?.check_out;

  // Determine whether checkout is allowed (office end time has passed)
  const [isAfterClosing, setIsAfterClosing] = useState(() => {
    if (!officeEndTime) return true;
    const [h, m] = officeEndTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return true;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
  });

  // Schedule a timer to flip isAfterClosing and pop a toast when closing time arrives
  useEffect(() => {
    if (!officeEndTime || !isCheckedIn || isCheckedOut) return;
    const [h, m] = officeEndTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;

    const check = () => {
      const now = new Date();
      const past = now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
      if (past && !notifiedRef.current) {
        notifiedRef.current = true;
        setIsAfterClosing(true);
        toast.info("Check-out is now available!", {
          description: "Office hours have ended — you can check out now.",
          duration: 10000,
        });
      }
    };

    check(); // run immediately
    const interval = setInterval(check, 30_000); // re-check every 30s
    return () => clearInterval(interval);
  }, [officeEndTime, isCheckedIn, isCheckedOut]);

  const handleAction = async () => {
    try {
      setLoading(true);
      if (!isCheckedIn) {
        const result = await attendanceService.checkIn(userId, userName);
        // If the record already had check_in AND we already knew about it, user was already checked in
        if (result.check_in && todayRecord?.check_in) {
          toast.info("Already checked in today");
        } else {
          toast.success("Checked in successfully");
          auditLogService.logAction(
            userId, userName, "create", "attendance",
            `Checked in for ${userName}`
          ).catch(() => {});

          // Auto-send late check-in notification email if status is "late"
          if (result.status === "late") {
            toast.warning("You checked in late — a notification has been sent.");
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
                    type: "late_checkin",
                    user_id: userId,
                    attendance_id: result.id,
                  }),
                }).catch(() => {}); // fire-and-forget
              }
            } catch {
              // Non-critical — email send failure shouldn't block check-in
            }
          }
        }
      } else if (!isCheckedOut) {
        await attendanceService.checkOut(userId);
        toast.success("Checked out successfully");
        auditLogService.logAction(
          userId, userName, "update", "attendance",
          `Checked out for ${userName}`
        ).catch(() => {});
      }
      invalidateAttendance();
      onSuccess?.();
    } catch (err) {
      toast.error(
        friendlyError(err, "Action failed")
      );
    } finally {
      setLoading(false);
    }
  };

  if (isCheckedIn && isCheckedOut) {
    return (
      <Button disabled variant="outline" size="sm">
        <LogOut className="h-4 w-4 mr-2" />
        Day Complete
      </Button>
    );
  }

  // After check-in, hide checkout button until office closing time
  if (isCheckedIn && !isAfterClosing) {
    return (
      <Button disabled variant="outline" size="sm" className="cursor-not-allowed opacity-60">
        <Clock className="h-4 w-4 mr-2" />
        Checkout at {officeEndTime}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleAction}
      disabled={loading}
      variant={isCheckedIn ? "destructive" : "default"}
      size="sm"
      className={
        !isCheckedIn
          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
          : ""
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isCheckedIn ? (
        <LogOut className="h-4 w-4 mr-2" />
      ) : (
        <LogIn className="h-4 w-4 mr-2" />
      )}
      {isCheckedIn ? "Check Out" : "Check In"}
    </Button>
  );
}

// ---- Override Dialog ----

interface OverrideDialogProps {
  attendance: Attendance;
  adminId: string;
  adminName: string;
}

export function OverrideDialog({
  attendance,
  adminId,
  adminName,
}: OverrideDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AttendanceOverrideFormData>({
    resolver: zodResolver(attendanceOverrideSchema),
    defaultValues: {
      status: attendance.status,
      reason: "",
    },
  });

  const onSubmit = async (data: AttendanceOverrideFormData) => {
    try {
      setLoading(true);
      await attendanceService.overrideStatus(
        attendance.id,
        data.status as AttendanceStatus,
        adminId,
        data.reason
      );
      toast.success("Attendance status overridden");
      invalidateAttendance();
      auditLogService.logAction(
        adminId, adminName, "update", "attendance",
        `Admin override: ${attendance.user_name} status changed to ${data.status} (reason: ${data.reason})`
      ).catch(() => {});
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(
        friendlyError(err, "Override failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Shield className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border-strong">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Override Attendance
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Override status for {attendance.user_name} on{" "}
            {attendance.date}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-foreground">Status</Label>
            <Select
              defaultValue={attendance.status}
              onValueChange={(v) =>
                setValue("status", v as AttendanceStatus)
              }
            >
              <SelectTrigger className="bg-background border-border-strong text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border-strong">
                {ATTENDANCE_STATUSES.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="text-foreground"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-red-400 text-sm mt-1">
                {errors.status.message}
              </p>
            )}
          </div>

          <div>
            <Label className="text-foreground">Reason</Label>
            <Textarea
              {...register("reason")}
              placeholder="Reason for override"
              className="bg-background border-border-strong text-foreground"
            />
            {errors.reason && (
              <p className="text-red-400 text-sm mt-1">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Override
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
