"use client";

import { Badge } from "@/components/ui/badge";
import { getActionConfig, getModuleLabel } from "@/lib/validations/audit-log";
import {
  PlusCircle,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  FileUp,
  Database,
  Settings,
  Key,
  Activity,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  "plus-circle": PlusCircle,
  pencil: Pencil,
  "trash-2": Trash2,
  "log-in": LogIn,
  "log-out": LogOut,
  "file-up": FileUp,
  database: Database,
  settings: Settings,
  key: Key,
};

// ---- Action Badge ----

export function ActionBadge({ action }: { action: string }) {
  const config = getActionConfig(action);
  const color = config?.color || "#6b7280";

  return (
    <Badge
      variant="outline"
      style={{
        borderColor: `${color}40`,
        color,
        backgroundColor: `${color}15`,
      }}
    >
      {config?.label || action}
    </Badge>
  );
}

// ---- Action Icon ----

export function ActionIcon({
  action,
  className = "h-4 w-4",
}: {
  action: string;
  className?: string;
}) {
  const config = getActionConfig(action);
  const Icon = ICON_MAP[config?.icon || ""] || Activity;
  const color = config?.color || "#6b7280";

  return <Icon className={className} style={{ color }} />;
}

// ---- Module Badge ----

export function ModuleBadge({ module }: { module: string }) {
  return (
    <Badge
      variant="outline"
      className="border-muted-foreground/30 text-muted-foreground bg-muted-foreground/10"
    >
      {getModuleLabel(module)}
    </Badge>
  );
}

// ---- Timestamp Display ----

export function LogTimestamp({ timestamp }: { timestamp: string | Date }) {
  const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  return (
    <div className="text-muted-foreground text-xs">
      <span>
        {d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
      <span className="mx-1">·</span>
      <span>
        {d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    </div>
  );
}
