"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  Phone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRenewalCalendar } from "@/lib/hooks/use-renewals";
import { RENEWAL_STATUSES } from "@/lib/validations/renewal";
import type { Renewal, RenewalStatus } from "@/lib/types";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getStatusIcon(status: RenewalStatus) {
  switch (status) {
    case "due":
      return <AlertCircle className="h-3 w-3" />;
    case "contacted":
      return <Phone className="h-3 w-3" />;
    case "renewed":
      return <CheckCircle2 className="h-3 w-3" />;
    case "lost":
      return <XCircle className="h-3 w-3" />;
  }
}

function getStatusColor(status: RenewalStatus): string {
  const found = RENEWAL_STATUSES.find((s) => s.value === status);
  return found?.color || "#5D5D5D";
}

interface RenewalCalendarProps {
  onDayClick?: (date: string, renewals: Renewal[]) => void;
  onRenewalClick?: (renewal: Renewal) => void;
}

export function RenewalCalendar({
  onDayClick,
  onRenewalClick,
}: RenewalCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: calendarData, isLoading } = useRenewalCalendar(year, month);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateKey: string;
      renewals: Renewal[];
    }> = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const key = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        isToday: false,
        dateKey: key,
        renewals: calendarData?.[key] || [],
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday =
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();
      cells.push({
        day: d,
        isCurrentMonth: true,
        isToday,
        dateKey: key,
        renewals: calendarData?.[key] || [],
      });
    }

    // Next month leading days (fill to 42 cells = 6 rows)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const key = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        isToday: false,
        dateKey: key,
        renewals: calendarData?.[key] || [],
      });
    }

    return cells;
  }, [year, month, calendarData, today]);

  function goToPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  // Count total renewals this month
  const totalThisMonth = useMemo(() => {
    if (!calendarData) return 0;
    return Object.values(calendarData).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
  }, [calendarData]);

  return (
    <Card className="border-muted-foreground/20 bg-card">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              {MONTH_NAMES[month]} {year}
            </h3>
            <Badge variant="outline" className="ml-2 text-xs">
              {totalThisMonth} renewal{totalThisMonth !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((dow) => (
            <div
              key={dow}
              className="py-1 text-center text-xs font-medium text-muted-foreground"
            >
              {dow}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => (
              <motion.div
                key={`${cell.dateKey}-${idx}`}
                role="button"
                tabIndex={0}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex min-h-16 cursor-pointer flex-col items-start rounded-md border p-1 text-left transition-colors ${
                  cell.isCurrentMonth
                    ? "border-muted-foreground/20 bg-card hover:border-primary/40"
                    : "border-transparent bg-background/50 text-muted-foreground/50"
                } ${cell.isToday ? "border-primary/60 ring-1 ring-primary/30" : ""}`}
                onClick={() => {
                  if (cell.renewals.length > 0) {
                    onDayClick?.(cell.dateKey, cell.renewals);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && cell.renewals.length > 0) {
                    e.preventDefault();
                    onDayClick?.(cell.dateKey, cell.renewals);
                  }
                }}
              >
                {/* Day number */}
                <span
                  className={`text-xs font-medium ${
                    cell.isToday
                      ? "rounded-full bg-primary px-1.5 py-0.5 text-primary-foreground"
                      : cell.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                  }`}
                >
                  {cell.day}
                </span>

                {/* Renewal dots */}
                {cell.renewals.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {cell.renewals.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[0.6rem] leading-none transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: `${getStatusColor(r.status)}20`,
                          color: getStatusColor(r.status),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenewalClick?.(r);
                        }}
                        title={`${r.policy_number} — ${r.customer_name}`}
                      >
                        {getStatusIcon(r.status)}
                      </button>
                    ))}
                    {cell.renewals.length > 3 && (
                      <span className="rounded px-1 py-0.5 text-[0.6rem] text-muted-foreground">
                        +{cell.renewals.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 border-t border-muted-foreground/20 pt-3">
          {RENEWAL_STATUSES.map((s) => (
            <div
              key={s.value}
              className="flex items-center gap-1.5 text-xs"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
