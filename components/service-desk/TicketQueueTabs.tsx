"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Inbox, Users, UserX, LayoutGrid } from "lucide-react";

export type QueueType = "my" | "team" | "unassigned" | "all";

interface QueueTab {
  id: QueueType;
  label: string;
  icon: React.ElementType;
  count?: number;
  highlight?: boolean;
}

interface TicketQueueTabsProps {
  activeQueue: QueueType;
  onQueueChange: (queue: QueueType) => void;
  counts?: Partial<Record<QueueType, number>>;
}

export function TicketQueueTabs({
  activeQueue,
  onQueueChange,
  counts = {},
}: TicketQueueTabsProps) {
  const tabs: QueueTab[] = [
    {
      id: "my",
      label: "My Tickets",
      icon: Inbox,
      count: counts.my,
    },
    {
      id: "team",
      label: "Team",
      icon: Users,
      count: counts.team,
    },
    {
      id: "unassigned",
      label: "Unassigned",
      icon: UserX,
      count: counts.unassigned,
      highlight: (counts.unassigned ?? 0) > 0,
    },
    {
      id: "all",
      label: "All Tickets",
      icon: LayoutGrid,
      count: counts.all,
    },
  ];

  return (
    <div className="flex flex-col gap-1">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeQueue === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onQueueChange(tab.id)}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground border border-transparent"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </div>
            {tab.count !== undefined && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs min-w-[1.5rem] justify-center",
                  tab.highlight && "bg-red-500/10 text-red-400",
                  isActive && "bg-primary/20 text-primary"
                )}
              >
                {tab.count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
