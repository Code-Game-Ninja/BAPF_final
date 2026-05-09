"use client";

import { formatDistanceToNow } from "date-fns";
import {
  PlusCircle,
  ArrowRightLeft,
  MessageSquare,
  CalendarCheck,
  FileUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { LeadTimeline } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: PlusCircle,
  status_change: ArrowRightLeft,
  note_added: MessageSquare,
  follow_up_scheduled: CalendarCheck,
  document_uploaded: FileUp,
  converted: CheckCircle2,
  reassigned: ArrowRightLeft,
};

const ACTION_COLORS: Record<string, string> = {
  created: "text-blue-500 bg-blue-500/10",
  status_change: "text-amber-500 bg-amber-500/10",
  note_added: "text-sky-500 bg-sky-500/10",
  follow_up_scheduled: "text-purple-500 bg-purple-500/10",
  document_uploaded: "text-green-500 bg-green-500/10",
  converted: "text-emerald-500 bg-emerald-500/10",
  reassigned: "text-orange-500 bg-orange-500/10",
};

interface LeadTimelineViewProps {
  timeline: LeadTimeline[] | undefined;
  isLoading: boolean;
}

export function LeadTimelineView({ timeline, isLoading }: LeadTimelineViewProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="font-cabin font-bold uppercase tracking-wider text-sm text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Timeline
        </h3>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-cabin font-bold uppercase tracking-wider text-sm text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" /> Timeline
      </h3>

      {!timeline || timeline.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No activity yet.
        </p>
      ) : (
        <div className="space-y-1">
          {timeline.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] || MessageSquare;
            const colorClass = ACTION_COLORS[entry.action] || "text-gray-500 bg-gray-500/10";
            const timeAgo = entry.createdAt
              ? formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })
              : "";

            return (
              <div key={entry.id} className="flex gap-3 py-3 border-b border-border last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{entry.description}</p>
                  {entry.next_action && (
                    <p className="text-xs text-primary bg-primary/10 rounded px-2 py-0.5 mt-1.5 inline-block">
                      Next: {entry.next_action}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {entry.performed_by_name || "System"}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
