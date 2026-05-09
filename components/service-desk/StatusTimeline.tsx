"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STEPS = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

const STATUS_ORDER: Record<string, number> = {
  open: 0,
  in_progress: 1,
  pending: 2,
  resolved: 3,
  closed: 4,
};

interface StatusTimelineProps {
  currentStatus: string;
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentOrder = STATUS_ORDER[currentStatus] ?? 0;

  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, index) => {
        const stepOrder = STATUS_ORDER[step.id] ?? 0;
        const isCompleted = stepOrder < currentOrder;
        const isCurrent = step.id === currentStatus;
        const isPending = stepOrder > currentOrder;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted && "bg-green-500 border-green-500 text-white",
                  isCurrent && "bg-primary border-primary text-primary-foreground",
                  isPending && "bg-muted/30 border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Circle className={cn("w-3 h-3", isCurrent && "fill-current")} />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isCompleted && "text-green-400",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STATUS_STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 mb-5 transition-all",
                  stepOrder < currentOrder ? "bg-green-500" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
