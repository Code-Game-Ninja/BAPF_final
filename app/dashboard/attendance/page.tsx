"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AttendanceStatusBadge,
  CheckInOutButton,
  OverrideDialog,
} from "@/components/attendance/attendance-actions";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { HolidayManager } from "@/components/attendance/holiday-manager";
import {
  EarlyCheckoutDialog,
  EarlyCheckoutRequestsPanel,
} from "@/components/attendance/early-checkout";
import { attendanceService } from "@/lib/services/attendance.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { useTeamHierarchy } from "@/lib/hooks/use-performance";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useTodayAttendance,
  useTodayAllAttendance,
  useTodayStats,
  useUserMonthAttendance,
  useHolidays,
  useAttendanceByDate,
  usePendingEarlyCheckouts,
  useMyTodayEarlyCheckout,
  invalidateAttendance,
} from "@/lib/hooks/use-attendance";
import {
  Clock,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  UserX,
  AlertTriangle,
  Palmtree,
  Eye,
  Trash2,
  Mail,
  Loader2 as MailLoader,
  Sparkles,
} from "lucide-react";
import { hoverLift, pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";

export default function AttendancePage() {
  const { user: dbUser } = useAuth();
  const { settings } = useAppSettings();
  const router = useRouter();
  const isAdminOrManager = dbUser?.role === "admin" || dbUser?.role === "manager";

  // Date state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );

  // Data hooks
  const { data: todayRecords, isLoading: todayLoading, mutate: revalidateToday } = useTodayAttendance(
    dbUser?.id || null
  );
  const todayRecord = todayRecords?.[0] ?? null;
  const { data: _todayAll } = useTodayAllAttendance();
  const { data: todayStats } = useTodayStats();
  const { data: myMonthRecords } = useUserMonthAttendance(
    dbUser?.id || null,
    calYear,
    calMonth
  );
  // Derive stats directly from myMonthRecords so calendar dots and stats always match
  const myStats = useMemo(() => {
    const records = myMonthRecords || [];
    if (records.length === 0) return null;
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const halfDay = records.filter((r) => r.status === "half-day").length;
    const leave = records.filter((r) => r.status === "leave").length;
    const totalWorkedHours = Math.round(records.reduce((s, r) => s + (r.worked_hours || 0), 0) * 10) / 10;
    const daysWithHours = records.filter((r) => (r.worked_hours || 0) > 0).length;
    const avgWorkedHours = daysWithHours > 0 ? Math.round((totalWorkedHours / daysWithHours) * 10) / 10 : 0;
    return { present, absent, late, halfDay, leave, totalWorkedHours, avgWorkedHours, total: records.length };
  }, [myMonthRecords]);
  const { data: holidays } = useHolidays(calYear);
  const { data: dateRecords } = useAttendanceByDate(
    isAdminOrManager ? selectedDate : null
  );
  const { data: pendingEarlyCheckouts } = usePendingEarlyCheckouts();
  const { data: myEarlyCheckouts } = useMyTodayEarlyCheckout(dbUser?.id || null);
  const hasPendingRequest = (myEarlyCheckouts || []).some((r) => r.status === "pending");
  const [deleteAttendanceTarget, setDeleteAttendanceTarget] = useState<{ id: string; name: string } | null>(null);
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null);

  // Team hierarchy for filtering
  const { data: teamHierarchy } = useTeamHierarchy();
  const [teamFilter, setTeamFilter] = useState<string>("all");

  // Build manager options and member mapping
  const managers = useMemo(() => (teamHierarchy ?? []).filter(u => u.role === "manager"), [teamHierarchy]);
  const managerMemberMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    (teamHierarchy ?? []).forEach(u => {
      if (u.mapped_manager_id) {
        if (!map[u.mapped_manager_id]) map[u.mapped_manager_id] = [];
        map[u.mapped_manager_id].push(u.id);
      }
    });
    return map;
  }, [teamHierarchy]);

  // Filter attendance records by team
  const filteredDateRecords = useMemo(() => {
    if (!dateRecords) return [];
    if (teamFilter === "all") return dateRecords;
    if (teamFilter === "unassigned") {
      const assignedUserIds = new Set(Object.values(managerMemberMap).flat());
      return dateRecords.filter(r => !assignedUserIds.has(r.user_id));
    }
    // Filter by specific manager's team
    const teamMemberIds = managerMemberMap[teamFilter] ?? [];
    // Include the manager themselves
    const filterIds = new Set([teamFilter, ...teamMemberIds]);
    return dateRecords.filter(r => filterIds.has(r.user_id));
  }, [dateRecords, teamFilter, managerMemberMap]);

  // Get manager name for display
  const getManagerName = (managerId: string) => {
    return managers.find(m => m.id === managerId)?.name ?? "Unknown";
  };

  // Send attendance email reminder (late or absent)
  const handleSendAttendanceReminder = async (
    record: { id: string; user_id: string; user_name?: string; status: string },
    type: "late_checkin" | "absent_reminder"
  ) => {
    setSendingNotificationId(record.id);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error("Not authenticated"); return; }

      const res = await fetch("/api/attendance/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          user_id: record.user_id,
          attendance_id: record.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || "Failed to send notification");
        return;
      }

      const data = await res.json();
      toast.success(
        type === "late_checkin"
          ? `Late check-in notice sent to ${record.user_name || "employee"}`
          : `Absent reminder sent to ${record.user_name || "employee"}`,
        { description: `Email sent to ${data.sentTo}` }
      );
    } catch (error: unknown) {
      console.error("[Attendance] Notification failed:", error);
      toast.error("Failed to send notification");
    } finally {
      setSendingNotificationId(null);
    }
  };

  // Navigation
  const goMonth = (dir: number) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setCalMonth(m);
    setCalYear(y);
  };

  const formatTime = (ts?: string | Date | null) => {
    if (!ts) return "—";
    const d = typeof ts === "string" ? new Date(ts) : ts;
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!dbUser) return null;

  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className="mx-auto max-w-7xl space-y-5"
    >
      <section className="rounded-[2rem] border border-border bg-card/85 p-6 shadow-[0_12px_28px_rgba(47,62,64,0.05)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Workforce Operations</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground font-heading">
              Attendance
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd MMMM yyyy")}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3 w-3" />
              Live workforce desk
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {todayLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <motion.div {...hoverLift}>
                <CheckInOutButton
                  userId={dbUser.id}
                  userName={dbUser.name || dbUser.email}
                  todayRecord={todayRecord}
                  officeEndTime={settings.office_end_time}
                  onSuccess={() => revalidateToday()}
                />
              </motion.div>
            )}

            {settings.early_checkout_enabled && todayRecord?.check_in && !todayRecord?.check_out && (
              <motion.div {...hoverLift}>
                <EarlyCheckoutDialog
                  userId={dbUser.id}
                  userName={dbUser.name || dbUser.email}
                  attendanceId={todayRecord.id}
                  date={todayRecord.date}
                  hasPendingRequest={hasPendingRequest}
                />
              </motion.div>
            )}

            {todayRecord?.check_in && (
              <span className="rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs text-muted-foreground">
                In: {formatTime(todayRecord.check_in)}
                {todayRecord.check_out && ` | Out: ${formatTime(todayRecord.check_out)}`}
                {todayRecord.worked_hours != null && ` | ${Math.round(todayRecord.worked_hours * 10) / 10}h`}
              </span>
            )}
          </div>
        </div>
      </section>

      {isAdminOrManager && todayStats && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-5"
        >
          {[
            { label: "Present", value: todayStats.present, icon: UserCheck, panel: "border-emerald-500/30 bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
            { label: "Absent", value: todayStats.absent, icon: UserX, panel: "border-rose-500/30 bg-rose-500/10", text: "text-rose-700 dark:text-rose-300" },
            { label: "Late", value: todayStats.late, icon: AlertTriangle, panel: "border-amber-500/30 bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
            { label: "Half Day", value: todayStats.halfDay, icon: Clock, panel: "border-yellow-500/30 bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-300" },
            { label: "Leave", value: todayStats.leave, icon: Palmtree, panel: "border-blue-500/30 bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <Card className={item.panel}>
                <CardContent className="px-4 pb-3 pt-4">
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.text}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <p className={`mt-1 text-2xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Admin: Pending Early Checkout Requests */}
      {isAdminOrManager && pendingEarlyCheckouts && pendingEarlyCheckouts.length > 0 && (
        <EarlyCheckoutRequestsPanel
          requests={pendingEarlyCheckouts}
          adminId={dbUser?.id || ""}
          adminName={dbUser?.name || dbUser?.email || ""}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="my-attendance" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 rounded-2xl border border-border bg-card/90 p-1">
          <TabsTrigger
            value="my-attendance"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CalendarDays className="h-4 w-4 mr-1.5" />
            My Attendance
          </TabsTrigger>
          {isAdminOrManager && (
            <TabsTrigger
              value="team"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Team
            </TabsTrigger>
          )}
          {isAdminOrManager && (
            <TabsTrigger
              value="holidays"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Palmtree className="h-4 w-4 mr-1.5" />
              Holidays
            </TabsTrigger>
          )}
        </TabsList>

        {/* ---- My Attendance Tab ---- */}
        <TabsContent value="my-attendance" className="space-y-4">
          {/* Month nav */}
          <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-card/80 px-2 py-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goMonth(-1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-foreground font-medium min-w-35 text-center">
              {new Date(calYear, calMonth - 1).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goMonth(1)}
              className="h-8 w-8"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card/90 p-2 shadow-[0_8px_18px_rgba(47,62,64,0.04)]">
                <AttendanceCalendar
                  year={calYear}
                  month={calMonth}
                  records={myMonthRecords || []}
                  holidays={holidays}
                />
              </div>
            </div>

            {/* Stats for month */}
            <Card className="border-border bg-card/90 shadow-[0_8px_18px_rgba(47,62,64,0.04)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-lg">
                  Monthly Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myStats ? (
                  <>
                    <StatRow
                      label="Present"
                      value={myStats.present}
                      color="#4ade80"
                    />
                    <StatRow
                      label="Absent"
                      value={myStats.absent}
                      color="#f87171"
                    />
                    <StatRow
                      label="Half Day"
                      value={myStats.halfDay}
                      color="#fbbf24"
                    />
                    <StatRow
                      label="Late"
                      value={myStats.late}
                      color="#fb923c"
                    />
                    <StatRow
                      label="Leave"
                      value={myStats.leave}
                      color="#60a5fa"
                    />
                    <div className="mt-3 border-t border-border pt-3">
                      <StatRow
                        label="Total Hours"
                        value={`${myStats.totalWorkedHours}h`}
                        color="#EEAE9D"
                      />
                      <StatRow
                        label="Avg/Day"
                        value={`${myStats.avgWorkedHours}h`}
                        color="#EEAE9D"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---- Team Tab (Admin) ---- */}
        {isAdminOrManager && (
          <TabsContent value="team" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto border-border bg-card text-foreground"
              />
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-50 border-border bg-card text-foreground">
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {managers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}&apos;s Team ({(managerMemberMap[m.id]?.length ?? 0) + 1})
                    </SelectItem>
                  ))}
                  <SelectItem value="unassigned">Unassigned Employees</SelectItem>
                </SelectContent>
              </Select>
              {teamFilter !== "all" && (
                <Badge variant="outline" className="text-xs border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  Showing: {teamFilter === "unassigned" ? "Unassigned" : `${getManagerName(teamFilter)}'s Team`}
                </Badge>
              )}
            </div>

            <Card className="border-border bg-card/90 shadow-[0_10px_22px_rgba(47,62,64,0.04)]">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-foreground text-lg">
                  Team Attendance —{" "}
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {filteredDateRecords.length} record{filteredDateRecords.length !== 1 ? "s" : ""}
                </span>
              </CardHeader>
              <CardContent>
                {!filteredDateRecords?.length ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    No records for this date{teamFilter !== "all" ? " in selected team" : ""}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-muted-foreground">
                            Name
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Team
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Status
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Check In
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Check Out
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Hours
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDateRecords.map((record) => {
                          // Find manager for this user
                          const userInfo = teamHierarchy?.find(u => u.id === record.user_id);
                          const managerId = userInfo?.mapped_manager_id;
                          const managerName = managerId ? getManagerName(managerId) : null;
                          return (
                          <TableRow
                            key={record.id}
                            className="cursor-pointer border-border/70 hover:bg-muted/35"
                            onClick={() =>
                              router.push(
                                `/dashboard/attendance/${record.id}`
                              )
                            }
                          >
                            <TableCell className="text-foreground">
                              {record.user_name || "Unknown"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {managerName ? (
                                <Badge variant="outline" className="text-[10px] border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                  {managerName}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <AttendanceStatusBadge
                                status={record.status}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatTime(record.check_in)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatTime(record.check_out)}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {record.worked_hours != null
                                ? `${record.worked_hours}h`
                                : "-"}
                            </TableCell>
                            <TableCell
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1">
                                <OverrideDialog
                                  attendance={record}
                                  adminId={dbUser?.id || ""}
                                  adminName={
                                    dbUser?.name || dbUser?.email || ""
                                  }
                                />
                                {/* Send email reminder for late or absent */}
                                {(record.status === "late" || record.status === "absent") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
                                    title={record.status === "late" ? "Send Late Notice" : "Send Absent Reminder"}
                                    disabled={sendingNotificationId === record.id}
                                    onClick={() =>
                                      handleSendAttendanceReminder(
                                        record,
                                        record.status === "late" ? "late_checkin" : "absent_reminder"
                                      )
                                    }
                                  >
                                    {sendingNotificationId === record.id ? (
                                      <MailLoader className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  aria-label="View attendance record"
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/attendance/${record.id}`
                                    )
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {dbUser?.role === "admin" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                    title="Delete Record"
                                    onClick={() => setDeleteAttendanceTarget({ id: record.id, name: record.user_name || "Unknown" })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ---- Holidays Tab (Admin) ---- */}
        {isAdminOrManager && (
          <TabsContent value="holidays">
            <div className="flex items-center gap-3 mb-4">
              <Select
                value={String(calYear)}
                onValueChange={(v) => setCalYear(Number(v))}
              >
                <SelectTrigger className="w-30 border-border bg-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
                    (y) => (
                      <SelectItem
                        key={y}
                        value={String(y)}
                      >
                        {y}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <HolidayManager year={calYear} />
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Attendance Record AlertDialog */}
      <AlertDialog open={!!deleteAttendanceTarget} onOpenChange={(open) => !open && setDeleteAttendanceTarget(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Attendance Record</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete the attendance record for {deleteAttendanceTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (deleteAttendanceTarget && dbUser) {
                try {
                  await attendanceService.delete(deleteAttendanceTarget.id);
                  toast.success("Attendance record deleted");
                  invalidateAttendance();
                  auditLogService.logAction(
                    dbUser.uid || dbUser.id, dbUser.name || dbUser.email || "", "delete", "attendance",
                    `Deleted attendance record ${deleteAttendanceTarget.id} (${deleteAttendanceTarget.name})`
                  ).catch(() => {});
                } catch {
                  toast.error("Failed to delete attendance record");
                }
              }
              setDeleteAttendanceTarget(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ---- Helper Component ----

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
