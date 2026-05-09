"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, differenceInDays } from "date-fns";

interface ComplianceItem {
  id: string;
  title: string;
  due_date: string;
  status: string;
  category: string;
}

interface RegulatoryCalendarProps {
  items: ComplianceItem[];
  currentMonth?: Date;
  onItemClick?: (item: ComplianceItem) => void;
}

function getItemColor(dueDate: string, status: string): string {
  if (status === "completed") return "bg-green-500/20 text-green-400";
  const today = new Date();
  const due = new Date(dueDate);
  const daysUntil = differenceInDays(due, today);

  if (daysUntil < 0) return "bg-red-500/20 text-red-400"; // overdue
  if (daysUntil <= 7) return "bg-orange-500/20 text-orange-400"; // ≤7d
  if (daysUntil <= 30) return "bg-yellow-500/20 text-yellow-400"; // ≤30d
  return "bg-green-500/20 text-green-400"; // >30d
}

export function RegulatoryCalendar({
  items,
  currentMonth = new Date(),
  onItemClick,
}: RegulatoryCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map: Record<string, ComplianceItem[]> = {};
    for (const item of items) {
      const date = item.due_date;
      if (!map[date]) map[date] = [];
      map[date].push(item);
    }
    return map;
  }, [items]);

  // Get day of week for first day (0=Sun)
  const firstDayOfWeek = monthStart.getDay();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-bold uppercase tracking-wider">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500/30 inline-block" /> &gt;30d
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500/30 inline-block" /> ≤30d
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500/30 inline-block" /> ≤7d
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500/30 inline-block" /> Overdue
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}

        {/* Empty cells for first week */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayItems = itemsByDate[dateStr] ?? [];
          const hasItems = dayItems.length > 0;

          return (
            <div
              key={dateStr}
              className={`min-h-[60px] p-1 rounded-lg border transition-colors ${
                isToday(day)
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <p className={`text-xs font-medium mb-1 ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </p>
              <div className="space-y-0.5">
                {dayItems.slice(0, 2).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick?.(item)}
                    className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${getItemColor(item.due_date, item.status)}`}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.length > 2 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{dayItems.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
