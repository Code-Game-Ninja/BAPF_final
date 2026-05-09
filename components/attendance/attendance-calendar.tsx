"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Attendance, Holiday } from "@/lib/types";
import { ATTENDANCE_STATUSES } from "@/lib/validations/attendance";
import { CalendarDays } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/use-media-query";

interface AttendanceCalendarProps {
  year: number;
  month: number; // 1-indexed
  records: Attendance[];
  holidays?: Holiday[];
}

export function AttendanceCalendar({
  year,
  month,
  records,
  holidays = [],
}: AttendanceCalendarProps) {
  const isMobile = useIsMobile();
  const calendarData = useMemo(() => {
    // Build map of date â†’ attendance
    const attendanceMap: Record<string, Attendance> = {};
    for (const r of records) {
      attendanceMap[r.date] = r;
    }

    // Build set of holiday dates
    const holidaySet = new Set(holidays.map((h) => h.date));

    // Get first day of month and total days
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Build weeks grid
    const weeks: (null | {
      day: number;
      dateStr: string;
      attendance?: Attendance;
      isHoliday: boolean;
      isWeekend: boolean;
      isToday: boolean;
    })[][] = [];

    let currentWeek: typeof weeks[0] = [];

    // Fill leading empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();

      currentWeek.push({
        day,
        dateStr,
        attendance: attendanceMap[dateStr],
        isHoliday: holidaySet.has(dateStr),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === todayStr,
      });

      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill trailing empty cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [year, month, records, holidays]);

  const dayNames = isMobile
    ? ["S", "M", "T", "W", "T", "F", "S"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthName = new Date(year, month - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const getStatusColor = (status: string) => {
    return (
      ATTENDANCE_STATUSES.find((s) => s.value === status)?.color || "#5D5D5D"
    );
  };

  return (
    <Card className="bg-card border-border-strong">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {monthName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div
              key={d}
              className="text-center text-xs text-muted-foreground font-medium py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-1">
          {calendarData.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) =>
                !cell ? (
                  <div key={ci} className="h-8 sm:h-10" />
                ) : (
                  <div
                    key={ci}
                    className={`
                      h-8 sm:h-10 rounded-md flex flex-col items-center justify-center text-xs relative
                      ${cell.isToday ? "ring-1 ring-primary" : ""}
                      ${cell.isWeekend ? "bg-background/50" : "bg-background"}
                      ${cell.isHoliday ? "bg-[#60a5fa]/10" : ""}
                      border border-border-strong/50
                    `}
                  >
                    <span
                      className={`
                        ${cell.isToday ? "text-primary font-bold" : "text-foreground"}
                        ${cell.isWeekend && !cell.isToday ? "text-muted-foreground" : ""}
                      `}
                    >
                      {cell.day}
                    </span>
                    {cell.attendance && (
                      <div
                        className="w-2 h-2 rounded-full absolute bottom-1"
                        style={{
                          backgroundColor: getStatusColor(
                            cell.attendance.status
                          ),
                        }}
                        title={cell.attendance.status}
                      />
                    )}
                    {cell.isHoliday && !cell.attendance && (
                      <div
                        className="w-2 h-2 rounded-full absolute bottom-1"
                        style={{ backgroundColor: "#818cf8" }}
                        title="Holiday"
                      />
                    )}
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border-strong">
          {ATTENDANCE_STATUSES.map((s) => (
            <div key={s.value} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#818cf8" }}
            />
            <span className="text-xs text-muted-foreground">Holiday</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
