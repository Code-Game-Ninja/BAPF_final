"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { format } from "date-fns";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { attendanceService } from "@/lib/services/attendance.service";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime";
import { Attendance } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  AttendanceStatusBadge,
  OverrideDialog,
} from "@/components/attendance/attendance-actions";
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  MapPin,
  Shield,
  Loader2,
  Sparkles,
  Hash,
} from "lucide-react";

export default function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user: dbUser } = useAuth();
  const { settings } = useAppSettings();
  const router = useRouter();
  const isAdminOrManager = dbUser?.role === "admin" || dbUser?.role === "manager";

  const attendanceSwr = useSWR<Attendance | null>(
    `attendance-detail-${id}`,
    () => attendanceService.getById(id),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(attendanceSwr, "attendance", `id=eq.${id}`);
  const { data: record, isLoading } = attendanceSwr;

  const formatTime = (ts?: string | Date | null) => {
    if (!ts) return "—";
    const d = typeof ts === "string" ? new Date(ts) : ts;
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + "T00:00:00"), "EEEE, dd MMMM yyyy");
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Record not found</p>
        <Button
          variant="ghost"
          className="mt-4 text-primary"
          onClick={() => router.push("/dashboard/attendance")}
        >
          Back to Attendance
        </Button>
      </div>
    );
  }

  const checkInLabel = formatTime(record.check_in);
  const checkOutLabel = formatTime(record.check_out);
  const workedHoursLabel =
    record.worked_hours != null ? `${record.worked_hours} hours` : "-";

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/attendance")}
              className="border-border/80 bg-background/80 text-muted-foreground hover:bg-muted/60"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Attendance
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Attendance audit record
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Attendance Detail
            </h1>
            <p className="text-sm text-muted-foreground">{formatDate(record.date)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AttendanceStatusBadge status={record.status} />
            {isAdminOrManager && (
              <OverrideDialog
                attendance={record}
                adminId={dbUser?.id || ""}
                adminName={dbUser?.name || dbUser?.email || ""}
              />
            )}
          </div>
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            icon: Hash,
            label: "Record ID",
            value: record.id.slice(0, 8),
            panel: "border-blue-500/30 bg-blue-500/10",
            text: "text-blue-700 dark:text-blue-300",
          },
          {
            icon: User,
            label: "Employee",
            value: record.user_name || "Unknown",
            panel: "border-indigo-500/30 bg-indigo-500/10",
            text: "text-indigo-700 dark:text-indigo-300",
          },
          {
            icon: Clock,
            label: "Check In",
            value: checkInLabel,
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            icon: Calendar,
            label: "Worked",
            value: workedHoursLabel,
            panel: "border-amber-500/30 bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-300",
          },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <Card className={item.panel}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className={`mt-1 truncate text-sm font-semibold tracking-tight sm:text-base ${item.text}`}>
                      {item.value}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                    <item.icon className={`h-4 w-4 ${item.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employee Info */}
        <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-lg flex items-center gap-2 font-heading">
              <User className="h-5 w-5 text-primary" />
              Employee Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={record.user_name || "Unknown"} />
            <InfoRow label="User ID" value={record.user_id} />
            {settings.multi_branch_enabled && record.branch_id && (
              <InfoRow
                label="Branch"
                value={record.branch_id}
                icon={<MapPin className="h-3.5 w-3.5" />}
              />
            )}
          </CardContent>
        </Card>

        {/* Time Info */}
        <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-lg flex items-center gap-2 font-heading">
              <Clock className="h-5 w-5 text-primary" />
              Time Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Date" value={formatDate(record.date)} />
            <InfoRow label="Check In" value={checkInLabel} />
            <InfoRow label="Check Out" value={checkOutLabel} />
            <InfoRow label="Worked Hours" value={workedHoursLabel} />
          </CardContent>
        </Card>

        {/* Override Info (if any) */}
        {record.override_by && (
          <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)] md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-lg flex items-center gap-2 font-heading">
                <Shield className="h-5 w-5 text-primary" />
                Override Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Overridden By" value={record.override_by} />
              <InfoRow
                label="Reason"
                value={record.override_reason || "N/A"}
              />
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)] md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-lg flex items-center gap-2 font-heading">
              <Calendar className="h-5 w-5 text-primary" />
              Record Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Record ID" value={record.id} />
            {record.createdAt && (
              <InfoRow
                label="Created"
                value={(() => { const d = new Date(record.createdAt); return isNaN(d.getTime()) ? "-" : d.toLocaleString("en-IN"); })()}
              />
            )}
            {record.updatedAt && (
              <InfoRow
                label="Updated"
                value={(() => { const d = new Date(record.updatedAt); return isNaN(d.getTime()) ? "-" : d.toLocaleString("en-IN"); })()}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// ---- Helper ----

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right flex items-center gap-1.5 break-all">
        {icon}
        {value}
      </span>
    </div>
  );
}
