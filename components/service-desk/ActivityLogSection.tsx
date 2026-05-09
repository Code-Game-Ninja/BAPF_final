"use client";

import { format } from "date-fns";
import {
  Plus, ArrowRight, UserCheck, FileText, Upload, Trash2,
  ChevronUp, ShieldAlert, Pause, Play, Archive,
} from "lucide-react";

interface ActivityEntry {
  id: string;
  entry_type: string;
  description: string;
  old_value?: string;
  new_value?: string;
  performed_by_name: string;
  created_at: string;
}

const ENTRY_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  status_changed: ArrowRight,
  assigned: UserCheck,
  reassigned: UserCheck,
  note_added: FileText,
  document_uploaded: Upload,
  document_deleted: Trash2,
  escalated: ChevronUp,
  sla_breached: ShieldAlert,
  sla_paused: Pause,
  sla_resumed: Play,
  archived: Archive,
};

const ENTRY_COLORS: Record<string, string> = {
  created: "text-blue-400 bg-blue-500/10",
  status_changed: "text-amber-400 bg-amber-500/10",
  assigned: "text-green-400 bg-green-500/10",
  reassigned: "text-green-400 bg-green-500/10",
  note_added: "text-purple-400 bg-purple-500/10",
  document_uploaded: "text-cyan-400 bg-cyan-500/10",
  document_deleted: "text-red-400 bg-red-500/10",
  escalated: "text-red-400 bg-red-500/10",
  sla_breached: "text-red-400 bg-red-500/10",
  sla_paused: "text-orange-400 bg-orange-500/10",
  sla_resumed: "text-green-400 bg-green-500/10",
  archived: "text-gray-400 bg-gray-500/10",
};

interface ActivityLogSectionProps {
  entries: ActivityEntry[];
}

export function ActivityLogSection({ entries }: ActivityLogSectionProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const Icon = ENTRY_ICONS[entry.entry_type] ?? ArrowRight;
        const colorClass = ENTRY_COLORS[entry.entry_type] ?? "text-muted-foreground bg-muted/30";

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Icon */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm">{entry.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{entry.performed_by_name}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
            </div>

            {/* Connector line */}
            {index < entries.length - 1 && (
              <div className="absolute left-3.5 mt-7 w-0.5 h-3 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}
