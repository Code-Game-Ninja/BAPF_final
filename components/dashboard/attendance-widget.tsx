"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Clock, LogIn, LogOut, Loader2, CalendarDays, ClockArrowDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { attendanceService } from "@/lib/services/attendance.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import {
  useTodayAttendance,
  useMyTodayEarlyCheckout,
  invalidateAttendance,
} from "@/lib/hooks/use-attendance";
import { toast } from "sonner";
import { friendlyError } from "@/lib/helpers/friendly-error";
import { useState } from "react";

function formatTime(ts: Date | string | null | undefined): string {
  if (!ts) return "—";
  try {
    const date = typeof ts === "string" ? new Date(ts) : ts;
    return format(date, "hh:mm a");
  } catch {
    return "—";
  }
}

interface AttendanceWidgetProps {
  hideHeader?: boolean;
}

export function AttendanceWidget({ hideHeader }: AttendanceWidgetProps = {}) {
  const { user: dbUser } = useAuth();
  const { settings } = useAppSettings();
  const { data: todayRecords, isLoading, mutate: revalidate } = useTodayAttendance(
    dbUser?.id || null
  );
  const { data: earlyCheckoutRequests } = useMyTodayEarlyCheckout(dbUser?.id || null);
  const todayRecord = todayRecords?.[0] ?? null;
  const [loading, setLoading] = useState(false);

  const isCheckedIn = !!todayRecord?.check_in;
  const isCheckedOut = !!todayRecord?.check_out;

  // Check if there's a pending early checkout request
  const pendingEarlyCheckout = earlyCheckoutRequests?.find(
    (req) => req.status === "pending"
  );
  const approvedEarlyCheckout = earlyCheckoutRequests?.find(
    (req) => req.status === "approved"
  );

  const handleAction = async () => {
    if (!dbUser) return;
    try {
      setLoading(true);
      if (!isCheckedIn) {
        const result = await attendanceService.checkIn(
          dbUser.id,
          dbUser.name || dbUser.email
        );
        if (result.check_in && todayRecord) {
          toast.info("Already checked in today");
        } else {
          toast.success("Checked in successfully");
          auditLogService
            .logAction(
              dbUser.id,
              dbUser.name || dbUser.email,
              "create",
              "attendance",
              `Checked in for ${dbUser.name || dbUser.email}`
            )
            .catch(() => {});
        }
      } else if (!isCheckedOut) {
        await attendanceService.checkOut(dbUser.id);
        toast.success("Checked out successfully");
        auditLogService
          .logAction(
            dbUser.id,
            dbUser.name || dbUser.email,
            "update",
            "attendance",
            `Checked out for ${dbUser.name || dbUser.email}`
          )
          .catch(() => {});
      }
      // Directly revalidate this hook's SWR cache
      await revalidate();
      // Also invalidate other attendance-related hooks (stats, etc.)
      invalidateAttendance();
    } catch (err) {
      toast.error(friendlyError(err, "Action failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!dbUser) return null;

  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      {!hideHeader && (
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Attendance
            </CardTitle>
            <Badge variant="outline" className="border-border-strong bg-background/70 text-[10px] uppercase tracking-wide text-muted-foreground">
              Today
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Office hours: {settings.office_start_time} – {settings.office_end_time}
          </p>
        </CardHeader>
      )}
      <CardContent className="space-y-3 pt-0">
        <div className="rounded-xl border border-border/70 bg-background/55 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 text-xs text-muted-foreground">
            {isCheckedIn ? (
              <>
                <p className="flex items-center gap-1.5">
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">Checked In</span>{" "}
                  at {formatTime(todayRecord?.check_in)}
                  {todayRecord?.status === "late" && (
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">Late</Badge>
                  )}
                  {todayRecord?.status === "present" && (
                    <Badge variant="outline" className="border-emerald-500/40 px-1.5 py-0 text-[10px] text-emerald-700 dark:text-emerald-300">On Time</Badge>
                  )}
                </p>
                {isCheckedOut && (
                  <p>
                    <span className="font-medium text-orange-700 dark:text-orange-300">
                      Checked Out
                    </span>{" "}
                    at {formatTime(todayRecord?.check_out)}
                  </p>
                )}
                {todayRecord?.worked_hours != null && (
                  <p className="text-foreground/70">
                    Worked: {todayRecord.worked_hours}h
                  </p>
                )}
              </>
            ) : (
              <p className="text-foreground/60">No check-in recorded yet</p>
            )}
            </div>

            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : isCheckedIn && isCheckedOut ? (
              <Button disabled variant="outline" size="sm" className="border-border-strong bg-card">
                <LogOut className="mr-2 h-4 w-4" />
                Day Complete
              </Button>
            ) : isCheckedIn && pendingEarlyCheckout ? (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="border-orange-500/40 px-2 py-0.5 text-[10px] text-orange-700 dark:text-orange-300">
                  <ClockArrowDown className="mr-1 h-3 w-3" />
                  Early Leave Pending
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(pendingEarlyCheckout.createdAt)}
                </span>
              </div>
            ) : isCheckedIn && approvedEarlyCheckout && !isCheckedOut ? (
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className="border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                  <ClockArrowDown className="mr-1 h-3 w-3" />
                  Early Leave Approved
                </Badge>
                <Button
                  onClick={handleAction}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                  className="h-8"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Check Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleAction}
                disabled={loading}
                variant={isCheckedIn ? "destructive" : "default"}
                size="sm"
                className={!isCheckedIn ? "h-8 bg-primary text-primary-foreground hover:bg-primary/90" : "h-8"}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isCheckedIn ? (
                  <LogOut className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isCheckedIn ? "Check Out" : "Check In"}
              </Button>
            )}
          </div>
        </div>

        <Link
          href="/dashboard/attendance"
          className="flex items-center gap-2 border-t border-border/70 pt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          View full attendance
        </Link>
      </CardContent>
    </Card>
  );
}
