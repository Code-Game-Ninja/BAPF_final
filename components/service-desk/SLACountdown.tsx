"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle, Pause } from "lucide-react";
import { calculateRemainingTime } from "@/lib/sla/businessHours";
import { cn } from "@/lib/utils";

interface SLACountdownProps {
  createdAt: string;
  slaDeadline: string | null | undefined;
  isPaused?: boolean;
  isBreached?: boolean;
  className?: string;
  compact?: boolean; // compact mode for table rows
}

const COLOR_CLASSES = {
  green:   "text-green-400 bg-green-500/10 border-green-500/20",
  yellow:  "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  red:     "text-red-400 bg-red-500/10 border-red-500/20",
  breached:"text-red-400 bg-red-500/20 border-red-500/30",
  paused:  "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

export function SLACountdown({
  createdAt,
  slaDeadline,
  isPaused = false,
  isBreached = false,
  className,
  compact = false,
}: SLACountdownProps) {
  const [remaining, setRemaining] = useState(() => {
    if (!slaDeadline) return null;
    return calculateRemainingTime(
      new Date(createdAt),
      new Date(slaDeadline),
      new Date(),
      isPaused
    );
  });

  useEffect(() => {
    if (!slaDeadline) return;

    const update = () => {
      setRemaining(
        calculateRemainingTime(
          new Date(createdAt),
          new Date(slaDeadline),
          new Date(),
          isPaused
        )
      );
    };

    update();
    const interval = setInterval(update, 60_000); // update every 60s
    return () => clearInterval(interval);
  }, [createdAt, slaDeadline, isPaused]);

  if (!slaDeadline || !remaining) {
    return <span className="text-xs text-muted-foreground">No SLA</span>;
  }

  // Override with prop if already marked breached in DB
  const effectiveColor = isBreached ? "breached" : remaining.color;
  const effectiveDisplay = isBreached ? "BREACHED" : remaining.display;

  const colorClass = COLOR_CLASSES[effectiveColor] || COLOR_CLASSES.green;

  if (compact) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        colorClass,
        className
      )}>
        {effectiveColor === "paused" && <Pause className="w-3 h-3" />}
        {effectiveColor === "breached" && <AlertTriangle className="w-3 h-3" />}
        {effectiveColor !== "paused" && effectiveColor !== "breached" && <Clock className="w-3 h-3" />}
        {effectiveDisplay}
      </span>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border",
      colorClass,
      className
    )}>
      <div className="flex items-center gap-1.5">
        {effectiveColor === "paused" && <Pause className="w-4 h-4" />}
        {effectiveColor === "breached" && <AlertTriangle className="w-4 h-4" />}
        {effectiveColor !== "paused" && effectiveColor !== "breached" && <Clock className="w-4 h-4" />}
        <span className="font-mono font-bold text-sm">{effectiveDisplay}</span>
      </div>
      {effectiveColor !== "breached" && effectiveColor !== "paused" && (
        <span className="text-xs opacity-70">remaining</span>
      )}
    </div>
  );
}
